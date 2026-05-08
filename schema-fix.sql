-- schema-fix.sql
-- Lomaz Home - Correcciones de schema Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- 1. Agregar columnas faltantes a la tabla propiedades
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS tipo_negocio TEXT DEFAULT 'venta';
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS negocio TEXT DEFAULT 'venta';
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS barrio TEXT;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS estrato INTEGER;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS area_construida NUMERIC;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS area_total NUMERIC;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS habitaciones INTEGER DEFAULT 0;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS banos INTEGER DEFAULT 0;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS garajes INTEGER DEFAULT 0;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS piso INTEGER;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS pisos_totales INTEGER;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS edad_inmueble INTEGER;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'borrador';
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS precio BIGINT;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS precio_admin BIGINT;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS precio_negociable BOOLEAN DEFAULT false;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Apartamento';
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS ciudad TEXT;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS departamento TEXT;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS latitud NUMERIC;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS longitud NUMERIC;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]';
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS foto_principal TEXT;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS caracteristicas JSONB DEFAULT '[]';
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS amenidades JSONB DEFAULT '[]';
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS asesor_id UUID REFERENCES auth.users(id);
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS publicado_portales JSONB DEFAULT '[]';
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS vistas INTEGER DEFAULT 0;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS favoritos INTEGER DEFAULT 0;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS destacado BOOLEAN DEFAULT false;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS codigo_interno TEXT;

-- 2. Sincronizar tipo_negocio con negocio (por compatibilidad)
UPDATE propiedades SET tipo_negocio = negocio WHERE tipo_negocio IS NULL AND negocio IS NOT NULL;
UPDATE propiedades SET negocio = tipo_negocio WHERE negocio IS NULL AND tipo_negocio IS NOT NULL;

-- 3. Tabla leads - columnas faltantes
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mensaje TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS propiedad_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS asesor_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'nuevo';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cliente_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fuente TEXT DEFAULT 'web';

-- 4. Tabla clientes - columnas faltantes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nombre_completo TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_cliente TEXT DEFAULT 'comprador';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ciudad TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS presupuesto_max BIGINT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS asesor_id UUID;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'activo';

-- 5. Tabla perfiles (asesores)
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS nombre_completo TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS agencia TEXT DEFAULT 'Lomaz Home';
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS matricula TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS anos_experiencia INTEGER DEFAULT 0;

-- 6. RLS Policies basicas para propiedades
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;

-- Lectura publica de propiedades publicadas
DROP POLICY IF EXISTS "propiedades_select_public" ON propiedades;
CREATE POLICY "propiedades_select_public" ON propiedades
  FOR SELECT USING (estado = 'publicado' OR auth.uid() = asesor_id);

-- Insertar/actualizar solo el dueno
DROP POLICY IF EXISTS "propiedades_insert_auth" ON propiedades;
CREATE POLICY "propiedades_insert_auth" ON propiedades
  FOR INSERT WITH CHECK (auth.uid() = asesor_id);

DROP POLICY IF EXISTS "propiedades_update_auth" ON propiedades;
CREATE POLICY "propiedades_update_auth" ON propiedades
  FOR UPDATE USING (auth.uid() = asesor_id);

DROP POLICY IF EXISTS "propiedades_delete_auth" ON propiedades;
CREATE POLICY "propiedades_delete_auth" ON propiedades
  FOR DELETE USING (auth.uid() = asesor_id);

-- 7. RLS leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_insert_public" ON leads;
CREATE POLICY "leads_insert_public" ON leads
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "leads_select_auth" ON leads;
CREATE POLICY "leads_select_auth" ON leads
  FOR SELECT USING (auth.uid() IS NOT NULL);

SELECT 'Schema fix completado. Ejecutar este SQL en Supabase Dashboard.';
