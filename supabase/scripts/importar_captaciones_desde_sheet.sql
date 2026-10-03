-- Importación única de las captaciones del Google Sheet a public.captaciones.
-- Correr DESPUÉS de supabase/migrations/20261003_captaciones.sql.
--
-- Paso previo (panel de Supabase, sin pasar los datos por nadie más):
--   1. En Google Sheets: Archivo → Descargar → CSV de la hoja de captación.
--   2. Supabase → Table Editor → New table → "Import data from CSV".
--      Nombre: captaciones_import. Deja "Enable Row Level Security" ACTIVADO.
--   3. Borra el CSV de tu computador cuando termines.
--
-- Revisa antes los nombres de columna que creó Supabase:
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'captaciones_import';
-- Deben coincidir con los de la lista `campos_inmueble` (encabezados del Sheet).

begin;

revoke all on table public.captaciones_import from anon, authenticated;

with campos as (
  select array[
    'Propietario / Empresa', 'Modalidad', 'Tipo Inmueble', 'Barrio', 'Ciudad',
    'Dirección', 'Precio Venta ($)', 'Canon Arriendo ($)', 'Administración Plena ($)',
    'Área Principal (m²)', 'Área Lote (m²)', 'Habitaciones', 'Baños', 'Parqueaderos',
    'Estrato', 'Años Construido', 'Piso', 'Tipo Piso', 'Lugares de Interés',
    'Lo Más Destacado', 'Info Adicional'
  ] as campos_inmueble
),
filas as (
  select to_jsonb(i) as j from public.captaciones_import i
)
insert into public.captaciones (origen, propietario_nombre, datos_inmueble, datos_propietario)
select
  'sheet_captacion',
  nullif(trim(f.j ->> 'Propietario / Empresa'), ''),
  (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
     from jsonb_each(f.j) where key = any (c.campos_inmueble)),
  (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
     from jsonb_each(f.j) where key <> all (c.campos_inmueble))
from filas f, campos c;

-- Debe dar el mismo número de filas que el Sheet (17).
select count(*) as importadas from public.captaciones where origen = 'sheet_captacion';

drop table public.captaciones_import;

commit;
