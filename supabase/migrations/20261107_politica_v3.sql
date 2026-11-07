-- ============================================================
-- LoMaz Home — Política de Tratamiento de Datos v3 (2026-11-07)
--
-- La v3 incorpora al asistente Lomi (WhatsApp, Messenger e Instagram). Desde hoy,
-- las autorizaciones que Lomi registra en el chat guardan esta versión como prueba.
-- (Los formularios del sitio toman la versión de lomaz-contacto.js y contactos.html.)
--
-- Se ejecuta UNA sola vez en Supabase → SQL Editor. Es seguro repetirlo.
-- ============================================================

alter table public.msj_config alter column politica_version set default 'v3-2026-11-07';
update public.msj_config set politica_version = 'v3-2026-11-07', updated_at = now() where id = 1;

-- Los textos legales del chat (aviso y autorizaciones) ya no se cambian desde el panel:
-- se borran las copias que hubiera para que nunca quede un texto distinto al versionado.
update public.msj_config set mensajes = mensajes - 'aviso' - 'autorizacion_interesado' - 'autorizacion_propietario' where id = 1;

-- Supresión a los 24 meses (sección 17 de la v3): cuando un contacto sin negocio se
-- anonimiza, también se borran sus conversaciones por chat con Lomi (los mensajes caen
-- en cascada). Es la misma función de 20261008_depuracion_24_meses.sql con esa línea más.
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
    delete from public.msj_conversaciones    where contacto_id = any(ids);
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
  values (n, 'Regla: sin negocio y 24 meses sin movimiento (Política v3, sección 17), incluidas las conversaciones por chat');
  return n;
end;
$$;
revoke all on function public.depurar_contactos() from public, anon;
grant execute on function public.depurar_contactos() to authenticated;
