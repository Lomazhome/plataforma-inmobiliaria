// Seguridad de los datos de captación (auditoría 2026-10-03, hallazgo CR-1).
// Los datos de propietarios (cédulas, teléfonos) ya no pueden salir de un
// Google Apps Script público: viven en la tabla `captaciones` de Supabase,
// legible solo por administradores.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { listarArchivos, leer, RAIZ } from "./utilidades.mjs";

const MIGRACION = "supabase/migrations/20261003_captaciones.sql";

const publicados = listarArchivos().filter(
  (f) => /\.(html|js|json)$/.test(f) && !/^tests[\\/]/.test(f)
);

function bloqueImportacion() {
  const html = leer("agregar-propiedad.html");
  const inicio = html.indexOf("__LOMAZ_IMPORT__");
  assert.ok(inicio > -1, "no se encontró el bloque de importación de captación");
  return html.slice(inicio, html.indexOf("</script>", inicio));
}

test("ningún archivo publicado contiene una URL de Google Apps Script", () => {
  const hallados = publicados.filter((f) => leer(f).includes("script.google.com/macros/"));
  assert.deepEqual(hallados, []);
});

test("la CSP ya no permite conexiones a Google Apps Script", () => {
  const vercel = leer("vercel.json");
  assert.ok(!vercel.includes("script.google.com"), "vercel.json aún permite script.google.com");
  assert.ok(!vercel.includes("script.googleusercontent.com"), "vercel.json aún permite script.googleusercontent.com");
});

test("la importación lee de la tabla captaciones con la sesión del usuario", () => {
  const bloque = bloqueImportacion();
  assert.match(bloque, /\.from\(\s*["']captaciones["']\s*\)/);
  assert.ok(!/fetch\(\s*API_URL/.test(bloque), "sigue llamando a API_URL");
});

test("la importación no pide columnas sensibles del propietario", () => {
  const bloque = bloqueImportacion();
  assert.ok(!/select\(\s*["']\*["']\s*\)/.test(bloque), 'no uses select("*")');
  assert.ok(!/datos_propietario/.test(bloque), "el panel no necesita datos_propietario");
});

test("la tarjeta escapa los datos antes de pintarlos (sin XSS)", () => {
  const bloque = bloqueImportacion();
  assert.ok(!/"\s*\+\s*(nombre|modalidad)\s*\+\s*"/.test(bloque), "nombre o modalidad se concatenan sin escapar");
  assert.ok(!/Detalle: "\s*\+\s*\(\(d&&d\.error\)/.test(bloque), "el error se pinta sin escapar");
});

test("las áreas con decimales se importan sin multiplicarse", () => {
  const bloque = bloqueImportacion();
  const fuente = bloque.match(/function area\(val\)\{[^\n]*\}/);
  assert.ok(fuente, "falta la función area()");
  const area = new Function(`${fuente[0]}; return area;`)();
  const casos = [[171.5, 171.5], ["171,5", 171.5], ["66.66", 66.66], ["120 m²", 120], ["1.250", 1250], ["1.250,5", 1250.5], ["", ""], [null, ""]];
  for (const [entrada, esperado] of casos) assert.equal(area(entrada), esperado, `area(${JSON.stringify(entrada)})`);
  assert.match(bloque, /setVal\("m2_construccion",\s*area\(/);
  assert.match(bloque, /setVal\("m2_terreno",\s*area\(/);
});

test("la migración existe y activa RLS", () => {
  assert.ok(existsSync(join(RAIZ, MIGRACION)), `falta ${MIGRACION}`);
  const sql = leer(MIGRACION).toLowerCase();
  assert.match(sql, /create table if not exists public\.captaciones/);
  assert.match(sql, /alter table public\.captaciones enable row level security/);
  assert.match(sql, /alter table public\.captaciones force row level security/);
});

test("la migración no da ningún acceso al rol anónimo", () => {
  const sql = leer(MIGRACION).toLowerCase();
  assert.match(sql, /revoke all on (table )?public\.captaciones from anon/);
  assert.ok(!/to\s+anon/.test(sql), "hay una política o grant para anon");
  assert.ok(!/to\s+public/.test(sql), "hay una política o grant para public");
  assert.ok(!/using\s*\(\s*true\s*\)/.test(sql), "hay una política using (true)");
});

test("solo administradores pueden leer o modificar captaciones", () => {
  const sql = leer(MIGRACION).toLowerCase();
  const politicas = sql.match(/create policy[\s\S]*?;/g) ?? [];
  assert.ok(politicas.length > 0, "no hay políticas");
  for (const p of politicas) {
    assert.match(p, /to authenticated/, `política sin "to authenticated": ${p.slice(0, 60)}`);
    assert.match(p, /es_admin_captacion\(\)/, `política sin chequeo de admin: ${p.slice(0, 60)}`);
  }
});

test("la función de rol no permite secuestrar el search_path", () => {
  const sql = leer(MIGRACION).toLowerCase();
  const fn = sql.match(/create or replace function public\.es_admin_captacion[\s\S]*?\$\$;/);
  assert.ok(fn, "falta la función es_admin_captacion");
  assert.match(fn[0], /security definer/);
  assert.match(fn[0], /set search_path\s*=\s*''/);
  assert.match(fn[0], /auth\.uid\(\)/);
});
