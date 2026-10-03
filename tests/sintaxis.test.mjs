// Revisa que todo el código del sitio se pueda leer sin errores de sintaxis:
// los .js sueltos, las funciones de Vercel (api/), las funciones de Supabase (.ts)
// y los <script> escritos dentro de cada página .html.
// Si alguno tiene un error, la página o la función se rompería en producción.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
import { listarArchivos, leer, RAIZ } from "./utilidades.mjs";

// Archivos con problemas ya conocidos que todavía no se han resuelto.
// Cada uno debe tener la razón al lado. Lo ideal es que esta lista quede vacía.
const IGNORADOS = new Map([
]);

const archivos = listarArchivos().filter((f) => !f.startsWith("tests/") && !f.startsWith(".claude/"));
const tmp = mkdtempSync(join(tmpdir(), "lomaz-sintaxis-"));

function revisarModulo(codigo, nombre) {
  const ruta = join(tmp, nombre.replace(/[\\/]/g, "__") + ".mjs");
  writeFileSync(ruta, codigo);
  const r = spawnSync(process.execPath, ["--check", ruta], { encoding: "utf8" });
  return r.status === 0 ? null : r.stderr.split("\n").slice(0, 6).join("\n");
}

test("archivos .js (raíz y api/) sin errores de sintaxis", () => {
  const errores = [];
  for (const f of archivos.filter((f) => f.endsWith(".js") && !IGNORADOS.has(f))) {
    const r = spawnSync(process.execPath, ["--check", join(RAIZ, f)], { encoding: "utf8" });
    if (r.status !== 0) errores.push(`${f}\n${r.stderr.split("\n").slice(0, 6).join("\n")}`);
  }
  assert.deepEqual(errores, [], errores.join("\n\n"));
});

test("funciones de Supabase (.ts) sin errores de sintaxis", () => {
  const errores = [];
  for (const f of archivos.filter((f) => f.endsWith(".ts") && !IGNORADOS.has(f))) {
    let js;
    try {
      js = stripTypeScriptTypes(leer(f));
    } catch (e) {
      errores.push(`${f}\n${e.message}`);
      continue;
    }
    const err = revisarModulo(js, f);
    if (err) errores.push(`${f}\n${err}`);
  }
  assert.deepEqual(errores, [], errores.join("\n\n"));
});

test("scripts dentro de las páginas .html sin errores de sintaxis", () => {
  const errores = [];
  const reScript = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const f of archivos.filter((f) => f.endsWith(".html"))) {
    const html = leer(f);
    let m, n = 0;
    while ((m = reScript.exec(html))) {
      n++;
      const attrs = m[1];
      const codigo = m[2];
      if (/\bsrc\s*=/.test(attrs) || !codigo.trim()) continue;
      const linea = html.slice(0, m.index).split("\n").length;
      const donde = `${f} (script #${n}, línea ${linea})`;
      const tipo = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1]?.toLowerCase();
      try {
        if (tipo && tipo.includes("json")) JSON.parse(codigo);
        else if (tipo === "module") {
          const err = revisarModulo(codigo, `${f}-${n}`);
          if (err) errores.push(`${donde}\n${err}`);
        } else if (!tipo || tipo.includes("javascript")) new vm.Script(codigo, { filename: donde });
        // Otros tipos (plantillas de texto, etc.) no se ejecutan como código.
      } catch (e) {
        errores.push(`${donde}\n${e.message}`);
      }
    }
  }
  assert.deepEqual(errores, [], errores.join("\n\n"));
});
