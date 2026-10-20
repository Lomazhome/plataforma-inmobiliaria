-- Banco de palabras clave del Agente de Marketing.
-- Cada fila es un estudio de un tema (boton «Estudiar tema» en marketing.html): el mapa de palabras
-- clave con sus puntajes, los dolores de la gente, los patrones de video y la decision.
-- Lo ve y lo edita todo el equipo de marketing (tabla marketing_equipo), igual que el Planificador.
--
-- Se ejecuta una sola vez en Supabase > SQL Editor. Se puede volver a ejecutar sin danar nada.
-- Requiere que ya exista la funcion public.es_equipo_marketing (archivo marketing_equipo.sql).

create table if not exists public.marketing_palabras_clave (
  id            uuid primary key default gen_random_uuid(),
  asesor_id     uuid not null default auth.uid(),
  tema          text not null,                        -- el tema tal como se escribio al estudiarlo
  principal     text,                                 -- palabra clave principal elegida
  veredicto     text,                                 -- Articulo madre / Reel o carrusel suelto / Descartar
  estudio       jsonb not null default '{}'::jsonb,   -- el estudio completo que devolvio el agente
  notas         text,                                 -- las notas de la busqueda (para no repetirla)
  fuentes       jsonb not null default '[]'::jsonb,   -- enlaces consultados
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists marketing_palabras_clave_tema on public.marketing_palabras_clave (lower(tema));

alter table public.marketing_palabras_clave enable row level security;

drop policy if exists "palabras_equipo_leer" on public.marketing_palabras_clave;
create policy "palabras_equipo_leer" on public.marketing_palabras_clave
  for select to authenticated using (asesor_id = auth.uid() or (public.es_equipo_marketing(auth.uid()) and public.es_equipo_marketing(asesor_id)));

drop policy if exists "palabras_equipo_crear" on public.marketing_palabras_clave;
create policy "palabras_equipo_crear" on public.marketing_palabras_clave
  for insert to authenticated with check (asesor_id = auth.uid());

drop policy if exists "palabras_equipo_cambiar" on public.marketing_palabras_clave;
create policy "palabras_equipo_cambiar" on public.marketing_palabras_clave
  for update to authenticated
  using (asesor_id = auth.uid() or (public.es_equipo_marketing(auth.uid()) and public.es_equipo_marketing(asesor_id)))
  with check (asesor_id = auth.uid() or (public.es_equipo_marketing(auth.uid()) and public.es_equipo_marketing(asesor_id)));

drop policy if exists "palabras_equipo_borrar" on public.marketing_palabras_clave;
create policy "palabras_equipo_borrar" on public.marketing_palabras_clave
  for delete to authenticated using (asesor_id = auth.uid() or (public.es_equipo_marketing(auth.uid()) and public.es_equipo_marketing(asesor_id)));

revoke all on public.marketing_palabras_clave from anon;
grant select, insert, update, delete on public.marketing_palabras_clave to authenticated;
