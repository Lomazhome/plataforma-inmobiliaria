-- Agente de Marketing: quincenas escritas a partir de un articulo madre.
-- Una fila por articulo madre: su fuente (titulo, enlace y texto aprobado) y el paquete generado
-- (guiones, textos de piezas y el copy de cada red, en bloques).
--
-- Se ejecuta una sola vez en Supabase > SQL Editor. Se puede volver a ejecutar sin danar nada.

create table if not exists public.marketing_quincenas (
  id            uuid primary key default gen_random_uuid(),
  asesor_id     uuid not null default auth.uid(),
  articulo      text not null,                       -- la misma etiqueta de publicaciones_marketing.articulo_madre
  titulo        text,                                -- titulo del articulo tal como se publica
  url           text,                                -- enlace del articulo: reemplaza a {{ENLACE}} en los textos
  texto_fuente  text,                                -- texto aprobado del articulo (o su esquema)
  paquete       jsonb not null default '{}'::jsonb,  -- { v, piezas: { <id de la publicacion>: {...} }, rutinas: {...} }
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint marketing_quincenas_unica unique (asesor_id, articulo)
);

-- Cada asesor ve y cambia solo sus quincenas, igual que sus publicaciones del Planificador.
alter table public.marketing_quincenas enable row level security;

drop policy if exists "quincenas_propias_leer" on public.marketing_quincenas;
create policy "quincenas_propias_leer" on public.marketing_quincenas
  for select to authenticated using (asesor_id = auth.uid());

drop policy if exists "quincenas_propias_crear" on public.marketing_quincenas;
create policy "quincenas_propias_crear" on public.marketing_quincenas
  for insert to authenticated with check (asesor_id = auth.uid());

drop policy if exists "quincenas_propias_cambiar" on public.marketing_quincenas;
create policy "quincenas_propias_cambiar" on public.marketing_quincenas
  for update to authenticated using (asesor_id = auth.uid()) with check (asesor_id = auth.uid());

drop policy if exists "quincenas_propias_borrar" on public.marketing_quincenas;
create policy "quincenas_propias_borrar" on public.marketing_quincenas
  for delete to authenticated using (asesor_id = auth.uid());

revoke all on public.marketing_quincenas from anon;
grant select, insert, update, delete on public.marketing_quincenas to authenticated;
