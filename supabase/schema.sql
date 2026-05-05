-- =============================================
-- EL BOLETERO - Schema de base de datos
-- Correr en Supabase > SQL Editor
-- =============================================

-- Enum para estado de boleta
CREATE TYPE estado_boleta AS ENUM ('pendiente', 'cobrada', 'cancelada');

-- Tabla de clientes
CREATE TABLE clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  empresa TEXT,
  direccion TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de boletas
CREATE TABLE boletas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  estado estado_boleta DEFAULT 'pendiente',
  fecha DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  subtotal NUMERIC(10,2) DEFAULT 0,
  descuento NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  cuotas INTEGER DEFAULT 1,
  notas TEXT,
  enviada_por_email BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de items de cada boleta
CREATE TABLE items_boleta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boleta_id UUID REFERENCES boletas(id) ON DELETE CASCADE NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(10,2) DEFAULT 1,
  precio_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

-- Indice para buscar boletas por user
CREATE INDEX idx_boletas_user_id ON boletas(user_id);
CREATE INDEX idx_boletas_estado ON boletas(estado);
CREATE INDEX idx_clientes_user_id ON clientes(user_id);
CREATE INDEX idx_items_boleta_id ON items_boleta(boleta_id);

-- Auto-update de updated_at en boletas
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER boletas_updated_at
  BEFORE UPDATE ON boletas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Solo el dueño ve sus propios datos
-- =============================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE boletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_boleta ENABLE ROW LEVEL SECURITY;

-- Policies para clientes
CREATE POLICY "usuarios ven sus clientes" ON clientes
  FOR ALL USING (auth.uid() = user_id);

-- Policies para boletas
CREATE POLICY "usuarios ven sus boletas" ON boletas
  FOR ALL USING (auth.uid() = user_id);

-- Policies para items (a través del user de la boleta)
CREATE POLICY "usuarios ven sus items" ON items_boleta
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM boletas WHERE boletas.id = items_boleta.boleta_id
      AND boletas.user_id = auth.uid()
    )
  );

-- =============================================
-- Función para auto-numerar boletas
-- Ejemplo: BOL-2025-001
-- =============================================

CREATE OR REPLACE FUNCTION siguiente_numero_boleta(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  anio TEXT;
  siguiente INTEGER;
BEGIN
  anio := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO siguiente
  FROM boletas
  WHERE user_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY') = anio;
  RETURN 'BOL-' || anio || '-' || LPAD(siguiente::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
