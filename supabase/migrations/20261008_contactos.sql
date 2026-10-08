-- ============================================================
-- LoMaz Home — CRM unificado "Contactos" (2026-10-08)
--
-- Reemplaza las tablas separadas `leads` y `clientes` por UNA sola tabla
-- `contactos` (propietarios, compradores e inquilinos), con:
--   · contacto_actividades : historial que nunca se borra (notas, cambios
--                            de etapa, mensajes, cierres).
--   · contacto_seguimientos: recordatorios automáticos (días 0,1,3,7,14,30,
--                            60,90) que se crean solos al entrar un contacto.
--
-- Se ejecuta UNA sola vez en Supabase → SQL Editor. Es seguro repetirlo
-- (usa IF NOT EXISTS / OR REPLACE). Las tablas viejas NO se borran: solo
-- se copian sus datos a `contactos` (una vez) para no perder nada.
-- ============================================================

-- ---------- 1. Tabla principal ----------
create table if not exists public.contactos (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Quién es
  nombre              text not null,
  telefono            text,                      -- solo dígitos, 10 cifras (se normaliza solo)
  email               text,
  tipo                text not null default 'comprador',   -- propietario | comprador | inquilino | otro
  negocio             text,                      -- venta | arriendo | ambos
  cedula              text,
  fecha_nacimiento    date,

  -- Etapa del embudo
  etapa               text not null default 'nuevo',
    -- nuevo → contactado → cita → propuesta → activo → oferta → cerrado | perdido
  motivo_perdida      text,
  cerrado_at          timestamptz,

  -- Datos del PROPIETARIO (los del Diagnóstico)
  direccion           text,
  zona                text,
  tipo_inmueble       text,
  m2                  numeric,
  habitaciones        int,
  precio_esperado     numeric,
  tiempo_publicado    text,                      -- "no publicado", "menos de 1 mes", "1-3 meses", "3-6 meses", "más de 6 meses"
  inmobiliaria_actual text,
  fecha_venta         text,                      -- "ya", "1-3 meses", "3-6 meses", "sin afán"

  -- Datos del COMPRADOR / INQUILINO
  presupuesto_min     numeric,
  presupuesto_max     numeric,
  zonas_interes       text,
  tipo_inmueble_interes text,
  habitaciones_min    int,

  -- Vínculos
  propiedad_id        text,                      -- inmueble de interés (comprador) o inmueble captado (propietario)
  asesor_id           uuid,                      -- quién lo lleva (perfiles_usuarios.id)

  -- De dónde vino
  fuente              text not null default 'web',   -- web | whatsapp | instagram | facebook | referido | portal | google | llamada | manual | otro
  canal               text,                      -- formulario_portada | formulario_contacto | ficha_propiedad | diagnostico | manual | ...
  campana             text,
  anuncio             text,
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  utm_content         text,
  pagina_origen       text,
  mensaje             text,                      -- lo que escribió al llegar

  -- Qué sigue
  proxima_accion      text,
  proxima_fecha       date,
  prioridad           text not null default 'media',   -- alta | media | baja
  notas               text,

  -- Resultado (al cerrar) → la base de datos que es la ventaja de LoMaz
  precio_final        numeric,
  visitas             int,
  ofertas             int,
  leads_recibidos     int,
  dias_hasta_cierre   int,

  -- Para la migración desde leads / clientes
  origen_tabla        text,
  origen_id           text
);

create index if not exists contactos_telefono_idx on public.contactos (telefono);
create index if not exists contactos_etapa_idx    on public.contactos (etapa);
create index if not exists contactos_proxima_idx  on public.contactos (proxima_fecha);
create unique index if not exists contactos_origen_idx on public.contactos (origen_tabla, origen_id) where origen_id is not null;

-- ---------- 2. Historial ----------
create table if not exists public.contacto_actividades (
  id            uuid primary key default gen_random_uuid(),
  contacto_id   uuid not null references public.contactos(id) on delete cascade,
  created_at    timestamptz not null default now(),
  usuario_id    uuid,
  tipo          text not null default 'nota',   -- nota | etapa | whatsapp | llamada | cita | seguimiento | sistema | cierre | perdida
  texto         text,
  datos         jsonb
);
create index if not exists contacto_actividades_cid_idx on public.contacto_actividades (contacto_id, created_at desc);

-- ---------- 3. Seguimientos automáticos ----------
create table if not exists public.contacto_seguimientos (
  id            uuid primary key default gen_random_uuid(),
  contacto_id   uuid not null references public.contactos(id) on delete cascade,
  dia           int not null,                  -- 0,1,3,7,14,30,60,90
  fecha         date not null,
  hecho         boolean not null default false,
  hecho_at      timestamptz,
  hecho_por     uuid,
  omitido       boolean not null default false
);
create index if not exists contacto_seguimientos_pend_idx on public.contacto_seguimientos (fecha) where hecho = false and omitido = false;

-- Citas: enlazarlas al contacto unificado
alter table public.citas add column if not exists contacto_id uuid references public.contactos(id) on delete set null;

-- ---------- 4. Funciones auxiliares ----------
create or replace function public.lh_tel_normalizar(t text)
returns text language sql immutable as $$
  select case
    when t is null then null
    when length(regexp_replace(t, '[^0-9]', '', 'g')) = 12 and regexp_replace(t, '[^0-9]', '', 'g') like '57%'
      then substr(regexp_replace(t, '[^0-9]', '', 'g'), 3)
    when regexp_replace(t, '[^0-9]', '', 'g') = '' then null
    else regexp_replace(t, '[^0-9]', '', 'g')
  end;
$$;

create or replace function public.es_usuario_activo()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles_usuarios p
    where p.id = auth.uid() and coalesce(p.activo, true)
  );
$$;
revoke all on function public.es_usuario_activo() from public, anon;

-- (por si la migración de captaciones no se ejecutó)
create or replace function public.es_admin_captacion()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles_usuarios p
    where p.id = auth.uid() and p.rol_id in (1, 4, 6) and coalesce(p.activo, true)
  );
$$;
revoke all on function public.es_admin_captacion() from public, anon;
grant execute on function public.es_admin_captacion() to authenticated;
grant execute on function public.es_usuario_activo() to authenticated;

-- ---------- 5. Triggers ----------
-- 5a. Antes de insertar: normaliza y evita duplicados por teléfono.
--     Si ya existe alguien con ese teléfono, NO se crea otro: se le agrega
--     una nota al que existe (y si estaba cerrado/perdido, se reactiva).
create or replace function public.contactos_antes_insertar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  existente public.contactos%rowtype;
begin
  new.telefono := public.lh_tel_normalizar(new.telefono);
  new.email    := nullif(lower(trim(coalesce(new.email,''))), '');
  new.nombre   := trim(new.nombre);
  if new.etapa is null or new.etapa = '' then new.etapa := 'nuevo'; end if;

  if new.telefono is not null and new.origen_tabla is null then
    select * into existente from public.contactos c
      where c.telefono = new.telefono
      order by c.created_at desc limit 1;
    if found then
      insert into public.contacto_actividades (contacto_id, usuario_id, tipo, texto, datos)
      values (existente.id, auth.uid(), 'sistema',
        'Volvió a contactarnos' || coalesce(' por ' || new.canal, '') ||
        coalesce(': ' || new.mensaje, ''),
        jsonb_build_object('canal', new.canal, 'fuente', new.fuente, 'propiedad_id', new.propiedad_id,
                           'utm_campaign', new.utm_campaign, 'utm_content', new.utm_content));
      update public.contactos set
        updated_at = now(),
        etapa = case when etapa in ('cerrado','perdido') then 'nuevo' else etapa end,
        motivo_perdida = case when etapa in ('cerrado','perdido') then null else motivo_perdida end,
        propiedad_id = coalesce(new.propiedad_id, propiedad_id),
        email = coalesce(email, new.email),
        mensaje = coalesce(new.mensaje, mensaje)
      where id = existente.id;
      return null;  -- no se inserta un duplicado
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists contactos_antes_insertar_tg on public.contactos;
create trigger contactos_antes_insertar_tg before insert on public.contactos
  for each row execute function public.contactos_antes_insertar();

-- 5b. Después de insertar: primera línea del historial + seguimientos automáticos.
create or replace function public.contactos_despues_insertar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  d int;
  dias int[];
begin
  insert into public.contacto_actividades (contacto_id, usuario_id, tipo, texto, datos)
  values (new.id, auth.uid(), 'sistema',
    case when new.origen_tabla is not null then 'Migrado desde ' || new.origen_tabla
         else 'Llegó por ' || coalesce(new.canal, new.fuente, 'registro manual') end,
    jsonb_build_object('canal', new.canal, 'fuente', new.fuente, 'campana', new.campana, 'anuncio', new.anuncio));

  -- Los contactos migrados o ya avanzados no reciben la secuencia automática
  if new.origen_tabla is null and new.etapa in ('nuevo','contactado') then
    if new.tipo = 'propietario' then dias := array[0,1,3,7,14,30,60,90];
    else dias := array[0,1,3,7,14,30]; end if;
    foreach d in array dias loop
      insert into public.contacto_seguimientos (contacto_id, dia, fecha)
      values (new.id, d, (new.created_at at time zone 'America/Bogota')::date + d);
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists contactos_despues_insertar_tg on public.contactos;
create trigger contactos_despues_insertar_tg after insert on public.contactos
  for each row execute function public.contactos_despues_insertar();

-- 5c. Antes de actualizar: fechas automáticas.
create or replace function public.contactos_antes_actualizar()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.telefono := public.lh_tel_normalizar(new.telefono);
  new.email    := nullif(lower(trim(coalesce(new.email,''))), '');
  if new.etapa in ('cerrado','perdido') and (old.etapa is distinct from new.etapa) then
    new.cerrado_at := now();
    new.dias_hasta_cierre := greatest(0, (now()::date - new.created_at::date));
  end if;
  if new.etapa not in ('cerrado','perdido') then
    new.cerrado_at := null;
    if new.etapa <> 'perdido' then new.motivo_perdida := null; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists contactos_antes_actualizar_tg on public.contactos;
create trigger contactos_antes_actualizar_tg before update on public.contactos
  for each row execute function public.contactos_antes_actualizar();

-- 5d. Después de actualizar: historial de cambios de etapa y de responsable;
--     cancela la secuencia automática cuando el contacto ya avanzó.
create or replace function public.contactos_despues_actualizar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.etapa is distinct from new.etapa then
    insert into public.contacto_actividades (contacto_id, usuario_id, tipo, texto, datos)
    values (new.id, auth.uid(),
      case when new.etapa = 'cerrado' then 'cierre' when new.etapa = 'perdido' then 'perdida' else 'etapa' end,
      'Pasó de ' || old.etapa || ' a ' || new.etapa ||
        case when new.etapa = 'perdido' and new.motivo_perdida is not null then ' · Motivo: ' || new.motivo_perdida else '' end,
      jsonb_build_object('de', old.etapa, 'a', new.etapa, 'motivo', new.motivo_perdida,
                         'precio_final', new.precio_final, 'visitas', new.visitas, 'ofertas', new.ofertas));
    if new.etapa in ('propuesta','activo','oferta','cerrado','perdido') then
      update public.contacto_seguimientos set omitido = true
        where contacto_id = new.id and hecho = false and omitido = false;
    end if;
  end if;
  if old.asesor_id is distinct from new.asesor_id then
    insert into public.contacto_actividades (contacto_id, usuario_id, tipo, texto, datos)
    values (new.id, auth.uid(), 'sistema', 'Cambió el responsable',
            jsonb_build_object('de', old.asesor_id, 'a', new.asesor_id));
  end if;
  return new;
end;
$$;
drop trigger if exists contactos_despues_actualizar_tg on public.contactos;
create trigger contactos_despues_actualizar_tg after update on public.contactos
  for each row execute function public.contactos_despues_actualizar();

-- ---------- 6. Permisos (RLS) ----------
-- Equipo: todos los usuarios activos ven y trabajan los mismos contactos.
-- Público (anon): SOLO puede crear un contacto nuevo desde los formularios.
alter table public.contactos             enable row level security;
alter table public.contacto_actividades  enable row level security;
alter table public.contacto_seguimientos enable row level security;

revoke all on table public.contactos, public.contacto_actividades, public.contacto_seguimientos from anon, authenticated;
grant insert on table public.contactos to anon;
grant select, insert, update, delete on table public.contactos to authenticated;
grant select, insert, delete on table public.contacto_actividades to authenticated;
grant select, insert, update on table public.contacto_seguimientos to authenticated;

drop policy if exists "contactos_publico_crear"  on public.contactos;
drop policy if exists "contactos_equipo_leer"    on public.contactos;
drop policy if exists "contactos_equipo_crear"   on public.contactos;
drop policy if exists "contactos_equipo_cambiar" on public.contactos;
drop policy if exists "contactos_admin_borrar"   on public.contactos;

create policy "contactos_publico_crear" on public.contactos
  for insert to anon
  with check (asesor_id is null and etapa = 'nuevo' and origen_tabla is null);

create policy "contactos_equipo_leer" on public.contactos
  for select to authenticated using (public.es_usuario_activo());
create policy "contactos_equipo_crear" on public.contactos
  for insert to authenticated with check (public.es_usuario_activo());
create policy "contactos_equipo_cambiar" on public.contactos
  for update to authenticated using (public.es_usuario_activo()) with check (public.es_usuario_activo());
create policy "contactos_admin_borrar" on public.contactos
  for delete to authenticated using (public.es_admin_captacion());

drop policy if exists "actividades_equipo_leer"  on public.contacto_actividades;
drop policy if exists "actividades_equipo_crear" on public.contacto_actividades;
drop policy if exists "actividades_admin_borrar" on public.contacto_actividades;
create policy "actividades_equipo_leer" on public.contacto_actividades
  for select to authenticated using (public.es_usuario_activo());
create policy "actividades_equipo_crear" on public.contacto_actividades
  for insert to authenticated with check (public.es_usuario_activo());
create policy "actividades_admin_borrar" on public.contacto_actividades
  for delete to authenticated using (public.es_admin_captacion());

drop policy if exists "seguimientos_equipo_leer"    on public.contacto_seguimientos;
drop policy if exists "seguimientos_equipo_crear"   on public.contacto_seguimientos;
drop policy if exists "seguimientos_equipo_cambiar" on public.contacto_seguimientos;
create policy "seguimientos_equipo_leer" on public.contacto_seguimientos
  for select to authenticated using (public.es_usuario_activo());
create policy "seguimientos_equipo_crear" on public.contacto_seguimientos
  for insert to authenticated with check (public.es_usuario_activo());
create policy "seguimientos_equipo_cambiar" on public.contacto_seguimientos
  for update to authenticated using (public.es_usuario_activo()) with check (public.es_usuario_activo());

-- Citas: que todo el equipo activo las vea (antes cada uno veía solo las suyas)
drop policy if exists "citas_equipo_leer"    on public.citas;
drop policy if exists "citas_equipo_crear"   on public.citas;
drop policy if exists "citas_equipo_cambiar" on public.citas;
create policy "citas_equipo_leer"    on public.citas for select to authenticated using (public.es_usuario_activo());
create policy "citas_equipo_crear"   on public.citas for insert to authenticated with check (public.es_usuario_activo());
create policy "citas_equipo_cambiar" on public.citas for update to authenticated using (public.es_usuario_activo()) with check (public.es_usuario_activo());

-- ---------- 7. Copiar lo que ya existía (una sola vez) ----------
-- Se leen las filas como JSON para que funcione aunque alguna columna
-- opcional (nombre_completo, tipo_cliente, cedula...) no exista en tu base.
-- Leads → contactos (compradores por defecto)
insert into public.contactos (origen_tabla, origen_id, created_at, nombre, telefono, email, mensaje, tipo, etapa,
                              propiedad_id, asesor_id, fuente, canal, notas)
select 'leads', j->>'id', coalesce((j->>'created_at')::timestamptz, now()),
       coalesce(nullif(trim(j->>'nombre'),''), 'Sin nombre'), j->>'telefono', j->>'email', j->>'mensaje',
       'comprador',
       case lower(coalesce(j->>'estado','nuevo'))
         when 'nuevo' then 'nuevo' when 'contactado' then 'contactado'
         when 'visita programada' then 'cita' when 'en negociación' then 'oferta' when 'en negociacion' then 'oferta'
         when 'cerrado ganado' then 'cerrado' when 'perdido' then 'perdido' else 'nuevo' end,
       j->>'propiedad_id', (j->>'asesor_id')::uuid, coalesce(j->>'fuente','web'),
       case when coalesce(j->>'fuente','') = 'homepage' then 'formulario_portada' else null end,
       j->>'notas'
from (select to_jsonb(l) as j from public.leads l) t
where not exists (select 1 from public.contactos c where c.origen_tabla = 'leads' and c.origen_id = t.j->>'id');

-- Clientes → contactos
insert into public.contactos (origen_tabla, origen_id, created_at, nombre, telefono, email, tipo, negocio, etapa,
                              asesor_id, fuente, presupuesto_max, zonas_interes, notas, cedula, fecha_nacimiento)
select 'clientes', j->>'id', coalesce((j->>'created_at')::timestamptz, now()),
       coalesce(nullif(trim(coalesce(j->>'nombre', j->>'nombre_completo')),''), 'Sin nombre'), j->>'telefono', j->>'email',
       case lower(coalesce(j->>'tipo', j->>'tipo_cliente', '')) when 'arriendo' then 'inquilino' else 'comprador' end,
       case lower(coalesce(j->>'tipo', j->>'tipo_cliente', '')) when 'arriendo' then 'arriendo' when 'ambos' then 'ambos' else 'venta' end,
       case lower(coalesce(j->>'estado','activo')) when 'cerrado' then 'cerrado' when 'inactivo' then 'perdido' else 'contactado' end,
       (j->>'asesor_id')::uuid, coalesce(j->>'fuente','manual'), nullif(j->>'presupuesto_max','')::numeric,
       nullif(concat_ws(', ', j->>'barrio_interes', j->>'ciudad'), ''), j->>'notas', j->>'cedula',
       nullif(j->>'fecha_nacimiento','')::date
from (select to_jsonb(c) as j from public.clientes c) t
where not exists (select 1 from public.contactos x where x.origen_tabla = 'clientes' and x.origen_id = t.j->>'id');

-- Citas viejas → enlazar al contacto migrado
update public.citas z set contacto_id = c.id
from public.contactos c, (select to_jsonb(y) as j, y.id as cid from public.citas y) t
where z.id = t.cid and z.contacto_id is null and (
  (t.j->>'lead_id' is not null    and c.origen_tabla = 'leads'    and c.origen_id = t.j->>'lead_id') or
  (t.j->>'cliente_id' is not null and c.origen_tabla = 'clientes' and c.origen_id = t.j->>'cliente_id'));
