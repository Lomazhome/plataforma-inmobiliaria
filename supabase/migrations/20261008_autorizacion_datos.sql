-- ============================================================
-- LoMaz Home — Autorización de tratamiento de datos en el CRM (2026-10-08)
-- Ley 1581 de 2012 · Decreto 1377 de 2013 · Política v1-2026-10-03
--
-- · Cada contacto guarda cuándo aceptó, qué versión del texto, por qué
--   canal y desde qué página (prueba de la autorización, art. 7 y 8 D.1377).
-- · Para los que llegan por WhatsApp o llamada, el asesor les envía un
--   enlace con un token; la página pública autorizacion.html registra la
--   aceptación sin exponer ningún dato (solo la función RPC de abajo).
-- Se ejecuta UNA sola vez en Supabase → SQL Editor. Es seguro repetirlo.
-- ============================================================

alter table public.contactos
  add column if not exists consent_at        timestamptz,
  add column if not exists consent_version   text,
  add column if not exists consent_canal     text,       -- formulario_portada | formulario_contacto | ficha_propiedad | diagnostico | enlace_whatsapp | captacion | verbal
  add column if not exists consent_pagina    text,
  add column if not exists consent_token     text unique default encode(gen_random_bytes(12), 'hex'),
  add column if not exists consent_enviado_at timestamptz;   -- última vez que se le envió el enlace

update public.contactos set consent_token = encode(gen_random_bytes(12), 'hex') where consent_token is null;

-- El público solo puede marcar la aceptación por token, nunca leer datos.
create or replace function public.registrar_autorizacion(p_token text, p_version text, p_pagina text)
returns table (nombre text) language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if p_token is null or length(p_token) < 12 then return; end if;
  update public.contactos c
     set consent_at = coalesce(c.consent_at, now()),
         consent_version = coalesce(c.consent_version, p_version),
         consent_canal = coalesce(c.consent_canal, 'enlace_whatsapp'),
         consent_pagina = coalesce(c.consent_pagina, p_pagina),
         updated_at = now()
   where c.consent_token = p_token
   returning c.id, split_part(c.nombre, ' ', 1) as nombre into r;
  if r.id is null then return; end if;
  -- (el historial lo escribe el trigger contactos_consent_log_tg)
  nombre := r.nombre; return next;
end;
$$;
revoke all on function public.registrar_autorizacion(text, text, text) from public;
grant execute on function public.registrar_autorizacion(text, text, text) to anon, authenticated;

-- Solo nombre de pila para saludar en la página de autorización (sin exponer más datos).
create or replace function public.nombre_para_autorizacion(p_token text)
returns text language sql stable security definer set search_path = '' as $$
  select split_part(c.nombre, ' ', 1) from public.contactos c
  where c.consent_token = p_token and length(coalesce(p_token,'')) >= 12 limit 1;
$$;
revoke all on function public.nombre_para_autorizacion(text) from public;
grant execute on function public.nombre_para_autorizacion(text) to anon, authenticated;

-- Los formularios públicos pueden insertar los campos de consentimiento
-- (la política de insert para anon ya existe; estas columnas la cumplen).
-- Historial automático cuando el equipo registra la aceptación desde la ficha.
create or replace function public.contactos_consent_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.consent_at is null and new.consent_at is not null and tg_op = 'UPDATE' then
    insert into public.contacto_actividades (contacto_id, usuario_id, tipo, texto, datos)
    values (new.id, auth.uid(), 'sistema',
      'Autorización de datos registrada (' || coalesce(new.consent_version,'') || ', ' || coalesce(new.consent_canal,'') || ')',
      jsonb_build_object('version', new.consent_version, 'canal', new.consent_canal));
  end if;
  return new;
end;
$$;
drop trigger if exists contactos_consent_log_tg on public.contactos;
create trigger contactos_consent_log_tg after update of consent_at on public.contactos
  for each row execute function public.contactos_consent_log();
