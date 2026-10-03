-- Captaciones de propietarios (antes en Google Sheets vía Apps Script público).
-- Auditoría 2026-10-03, CR-1: el Apps Script devolvía cédulas y teléfonos a
-- cualquiera. Ahora los datos viven aquí y solo los leen administradores.
--
-- datos_inmueble:    claves = encabezados del Sheet que usa el panel para
--                    autollenar (Tipo Inmueble, Barrio, Ciudad, Dirección...).
-- datos_propietario: todo lo demás (cédula, teléfono, correo, cónyuge...).
--                    El panel nunca lo pide.
--
-- Depende de que perfiles_usuarios.rol_id NO sea editable por el propio
-- usuario (auditoría AL-6); si lo es, un asesor podría volverse admin.

create table if not exists public.captaciones (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  origen             text not null default 'formulario_captacion',
  propietario_nombre text,
  datos_inmueble     jsonb not null default '{}'::jsonb,
  datos_propietario  jsonb not null default '{}'::jsonb,
  consent_at         timestamptz,
  consent_version    text
);

alter table public.captaciones enable row level security;
alter table public.captaciones force row level security;

revoke all on table public.captaciones from anon;
revoke all on table public.captaciones from authenticated;
grant select, insert, update, delete on table public.captaciones to authenticated;

-- Admin = roles 1, 4 y 6 (los mismos que usa el panel en catalogo-global,
-- mis-propiedades y clientes).
create or replace function public.es_admin_captacion()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles_usuarios p
    where p.id = auth.uid()
      and p.rol_id in (1, 4, 6)
      and coalesce(p.activo, true)
  );
$$;

revoke all on function public.es_admin_captacion() from public;
revoke all on function public.es_admin_captacion() from anon;
grant execute on function public.es_admin_captacion() to authenticated;

drop policy if exists "captaciones_admin_leer" on public.captaciones;
drop policy if exists "captaciones_admin_crear" on public.captaciones;
drop policy if exists "captaciones_admin_cambiar" on public.captaciones;
drop policy if exists "captaciones_admin_borrar" on public.captaciones;

create policy "captaciones_admin_leer" on public.captaciones
  for select to authenticated using (public.es_admin_captacion());

create policy "captaciones_admin_crear" on public.captaciones
  for insert to authenticated with check (public.es_admin_captacion());

create policy "captaciones_admin_cambiar" on public.captaciones
  for update to authenticated
  using (public.es_admin_captacion()) with check (public.es_admin_captacion());

create policy "captaciones_admin_borrar" on public.captaciones
  for delete to authenticated using (public.es_admin_captacion());
