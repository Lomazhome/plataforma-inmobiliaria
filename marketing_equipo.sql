-- Centro de mando de marketing compartido del equipo: Salomon, Angelica y Jose David.
-- Quien este en marketing_equipo ve y edita lo mismo que los demas del equipo: el Planificador
-- (publicaciones_marketing), las quincenas del Agente de Marketing (marketing_quincenas) y el Plan de Marca.
-- Las reglas que ya existian (cada asesor ve lo suyo) se conservan: estas solo agregan acceso al equipo.
--
-- Se ejecuta una sola vez en Supabase > SQL Editor. Se puede volver a ejecutar sin danar nada.

create table if not exists public.marketing_equipo (
  usuario_id   uuid primary key references auth.users(id) on delete cascade,
  nombre       text,
  agregado_en  timestamptz not null default now()
);

-- Salomon, Angelica y Jose David
insert into public.marketing_equipo (usuario_id, nombre) values
  ('b4839cd2-799d-4a60-8c8f-cb24f3b31cfa', 'Salomón'),
  ('49002dcd-76db-428e-b379-d510b522b984', 'María Angélica Vargas'),
  ('a004c891-1436-4408-99e0-aa0fed50782c', 'José David Castiblanco')
on conflict (usuario_id) do nothing;

-- Sirve para preguntar si alguien es del equipo sin que las reglas se llamen a si mismas
create or replace function public.es_equipo_marketing(u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.marketing_equipo where usuario_id = u);
$$;
revoke all on function public.es_equipo_marketing(uuid) from public, anon;
grant execute on function public.es_equipo_marketing(uuid) to authenticated;

alter table public.marketing_equipo enable row level security;
drop policy if exists "equipo_leer" on public.marketing_equipo;
create policy "equipo_leer" on public.marketing_equipo
  for select to authenticated using (public.es_equipo_marketing(auth.uid()));
revoke all on public.marketing_equipo from anon;
grant select on public.marketing_equipo to authenticated;

-- Planificador y calendario
drop policy if exists "equipo_marketing_publicaciones" on public.publicaciones_marketing;
create policy "equipo_marketing_publicaciones" on public.publicaciones_marketing
  for all to authenticated
  using (public.es_equipo_marketing(auth.uid()) and public.es_equipo_marketing(asesor_id))
  with check (public.es_equipo_marketing(auth.uid()) and public.es_equipo_marketing(asesor_id));

-- Agente de Marketing (guiones y textos ya escritos)
drop policy if exists "equipo_marketing_quincenas" on public.marketing_quincenas;
create policy "equipo_marketing_quincenas" on public.marketing_quincenas
  for all to authenticated
  using (public.es_equipo_marketing(auth.uid()) and public.es_equipo_marketing(asesor_id))
  with check (public.es_equipo_marketing(auth.uid()) and public.es_equipo_marketing(asesor_id));

-- Plan de Marca (si estas tablas ya estaban abiertas a todos los usuarios, esto no cambia nada)
drop policy if exists "equipo_marketing_fases" on public.marketing_fases;
create policy "equipo_marketing_fases" on public.marketing_fases
  for all to authenticated using (public.es_equipo_marketing(auth.uid())) with check (public.es_equipo_marketing(auth.uid()));
drop policy if exists "equipo_marketing_tareas" on public.marketing_tareas;
create policy "equipo_marketing_tareas" on public.marketing_tareas
  for all to authenticated using (public.es_equipo_marketing(auth.uid())) with check (public.es_equipo_marketing(auth.uid()));
drop policy if exists "equipo_marketing_avance" on public.marketing_avance;
create policy "equipo_marketing_avance" on public.marketing_avance
  for all to authenticated using (public.es_equipo_marketing(auth.uid())) with check (public.es_equipo_marketing(auth.uid()));

-- Comprobacion: debe mostrar a Salomon, Angelica y Jose David
select usuario_id, nombre from public.marketing_equipo;
