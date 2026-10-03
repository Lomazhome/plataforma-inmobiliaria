// Revisa que ninguna clave secreta quede escrita en el código.
// Todo lo que está en este repositorio es PÚBLICO (GitHub público + Vercel lo sirve),
// así que una clave aquí equivale a regalarla.
//
// La "anon key" de Supabase SÍ puede estar (es pública por diseño y la protege RLS).
// La "service_role" NO: salta todas las reglas de seguridad de la base de datos.

import { test } from "node:test";
import assert from "node:assert/strict";
import { listarArchivos, leer } from "./utilidades.mjs";

const TEXTO = /\.(html|js|mjs|ts|json|sql|md|txt|xml|css|env|yml|yaml)$|^\.env/;
const archivos = listarArchivos().filter((f) => TEXTO.test(f.split("/").pop()) && !f.startsWith("tests/"));

const PATRONES = [
  ["Clave secreta de Supabase (sb_secret_)", /sb_secret_[A-Za-z0-9_-]{10,}/],
  ["Clave de Anthropic", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["Clave de OpenAI", /sk-(proj-)?[A-Za-z0-9]{32,}/],
  ["Token de GitHub", /gh[pousr]_[A-Za-z0-9]{30,}/],
  ["Clave de AWS", /AKIA[0-9A-Z]{16}/],
  ["Clave de Google", /AIza[0-9A-Za-z_-]{35}/],
  ["Clave de Stripe", /sk_live_[0-9A-Za-z]{20,}/],
  ["Llave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Token de Vercel", /vercel_[A-Za-z0-9]{24,}/i],
];

function rolDelJWT(jwt) {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
    return payload.role;
  } catch {
    return null;
  }
}

test("ninguna clave secreta escrita en el código", () => {
  const hallazgos = [];
  for (const f of archivos) {
    const texto = leer(f);
    for (const [nombre, re] of PATRONES) {
      if (re.test(texto)) hallazgos.push(`${f}: ${nombre}`);
    }
    for (const jwt of texto.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) || []) {
      const rol = rolDelJWT(jwt);
      if (rol && rol !== "anon") hallazgos.push(`${f}: token JWT de Supabase con rol "${rol}" (solo se permite "anon")`);
    }
  }
  assert.deepEqual(hallazgos, [], "Se encontraron posibles claves secretas:\n" + hallazgos.join("\n"));
});

test("las funciones del servidor leen las claves de variables de entorno", () => {
  // Las funciones de Vercel (api/) y de Supabase deben usar process.env / Deno.env,
  // no claves escritas a mano.
  const sospechosos = [];
  const reAsignacion = /(api[_-]?key|secret|password|token|service[_-]?role)\w*\s*[:=]\s*["'`][A-Za-z0-9_\-.]{20,}["'`]/i;
  for (const f of archivos.filter((f) => f.startsWith("api/") || f.startsWith("supabase/functions/"))) {
    leer(f).split("\n").forEach((l, i) => {
      if (reAsignacion.test(l)) sospechosos.push(`${f}:${i + 1}: ${l.trim().slice(0, 80)}`);
    });
  }
  assert.deepEqual(sospechosos, [], "Posibles claves escritas a mano:\n" + sospechosos.join("\n"));
});
