// Escalada de privilegios en perfiles_usuarios (auditoría 2026-10-03, AL-6).
// Un asesor no puede cambiarse el rol ni reactivarse si un admin lo desactivó.

import { test } from "node:test";
import assert from "node:assert/strict";
import { leer } from "./utilidades.mjs";

const MIGRACION = "supabase/migrations/20261003_perfiles_proteger_rol.sql";
const sql = leer(MIGRACION).toLowerCase();

test("un trigger protege rol, estado y autoría del perfil", () => {
  assert.match(sql, /create trigger proteger_campos_perfil\s+before update on public\.perfiles_usuarios/);
  const fn = sql.match(/create or replace function public\.proteger_campos_perfil[\s\S]*?\$\$;/);
  assert.ok(fn, "falta la función del trigger");
  for (const campo of ["rol_id", "activo", "creado_por", "created_at"]) {
    assert.match(fn[0], new RegExp(`new\\.${campo} is distinct from old\\.${campo}`), `no protege ${campo}`);
  }
  assert.match(fn[0], /public\.is_admin\(\)/, "los admins deben poder cambiarlos");
  assert.match(fn[0], /set search_path\s*=\s*''/);
});

test("is_admin_user exige usuario activo y search_path fijo", () => {
  const fn = sql.match(/create or replace function public\.is_admin_user[\s\S]*?\$\$;/);
  assert.ok(fn, "falta is_admin_user");
  assert.match(fn[0], /security definer/);
  assert.match(fn[0], /set search_path\s*=\s*''/);
  assert.match(fn[0], /coalesce\(activo,\s*true\)/);
  assert.match(fn[0], /id = auth\.uid\(\)/);
});

test("el perfil del asesor no envía rol ni estado", () => {
  const html = leer("perfil-asesor.html");
  const payloads = html.match(/payload\s*=\s*\{[\s\S]*?\};/g) ?? [];
  assert.ok(payloads.length > 0, "no se encontraron los payloads de perfil-asesor.html");
  for (const p of payloads) assert.ok(!/rol_id|activo/.test(p), `payload con rol o estado: ${p.slice(0, 80)}`);
});
