-- ============================================================
-- LoMaz Home — Supresión automática a los 24 meses (2026-10-08)
-- Cumple la sección 17 de la Política de Tratamiento de Datos v2:
--   "Si no se celebra contrato: hasta 24 meses desde el último contacto,
--    después de lo cual se suprimen o anonimizan".
--
-- Qué hace, el día 1 de cada mes a las 3:00 a. m. (hora de Bogotá):
--   · Toma los contactos que NO tienen negocio (etapa nuevo, contactado,
--     cita, propuesta o perdido) y llevan 24 meses sin movimiento.
--   · Borra sus datos personales (nombre, teléfono, correo, cédula,
--     dirección, mensajes, notas, historial y seguimientos).
--   · Conserva solo datos de mercado sin identificar a nadie: tipo, zona,
--     precio esperado, etapa, motivo de pérdida y fechas.
--   · Los contactos con negocio (en proceso, oferta, cerrado) NO se tocan:
--     tienen contrato y la ley obliga a conservar esos soportes.
--   · Deja un registro de cada corrida en depuraciones_log.
-- Se ejecuta UNA sola vez en Supabase → SQL Editor. Es seguro repetirlo.
-- ============================================================

alter table public.contactos add column if not exists anonimizado_at timestamptz;

create table if not exists public.depuraciones_log (
  id          bigserial primary key,
  corrida_at  timestamptz not null default now(),
  anonimizados int not null,
  detalle     text
);
alter table public.depuraciones_log enable row level security;
revoke all on table public.depuraciones_log from anon, authenticated;
grant select on table public.depuraciones_log to authenticated;
drop policy if exists "depuraciones_admin_leer" on public.depuraciones_log;
create policy "depuraciones_admin_leer" on public.depuraciones_log
  for select to authenticated using (public.es_admin_captacion());

-- La función que anonimiza. Se puede ejecutar a mano:  select public.depurar_contactos();
create or replace function public.depurar_contactos()
returns int language plpgsql security definer set search_path = '' as $$
declare
  ids uuid[];
  n int;
begin
  select coalesce(array_agg(id), '{}') into ids
  from public.contactos c
  where c.anonimizado_at is null
    and c.etapa in ('nuevo','contactado','cita','propuesta','perdido')
    and greatest(c.updated_at, c.created_at, coalesce(c.cerrado_at, c.created_at)) < now() - interval '24 months';

  n := coalesce(array_length(ids, 1), 0);
  if n > 0 then
    delete from public.contacto_actividades  where contacto_id = any(ids);
    delete from public.contacto_seguimientos where contacto_id = any(ids);
    update public.citas set contacto_nombre = null, contacto_telefono = null,
                            propietario_nombre = null, propietario_telefono = null, notas = null
      where contacto_id = any(ids);
    update public.contactos set
      nombre = 'Contacto suprimido', telefono = null, email = null, cedula = null, fecha_nacimiento = null,
      direccion = null, mensaje = null, notas = null, proxima_accion = null, proxima_fecha = null,
      inmobiliaria_actual = null, utm_source = null, utm_medium = null, utm_content = null, pagina_origen = null,
      consent_token = null, consent_pagina = null, consent_enviado_at = null,
      anonimizado_at = now()
      where id = any(ids);
  end if;

  insert into public.depuraciones_log (anonimizados, detalle)
  values (n, 'Regla: sin negocio y 24 meses sin movimiento (Política v2, sección 17)');
  return n;
end;
$$;
revoke all on function public.depurar_contactos() from public, anon;
grant execute on function public.depurar_contactos() to authenticated;

-- El trigger de "antes de actualizar" normaliza el teléfono; con null no hace nada.
-- El de "después de actualizar" no registra nada porque la etapa no cambia.

-- Programación mensual con pg_cron (extensión incluida en Supabase).
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'lomaz-depurar-contactos') then
    perform cron.unschedule('lomaz-depurar-contactos');
  end if;
  -- 3:00 a. m. Bogotá = 8:00 UTC, el día 1 de cada mes
  perform cron.schedule('lomaz-depurar-contactos', '0 8 1 * *', $job$ select public.depurar_contactos(); $job$);
end
$$;
