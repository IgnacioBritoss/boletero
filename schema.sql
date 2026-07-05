-- ============================================================
-- El Boletero · Esquema para Neon (Postgres)
-- Corré este archivo entero en el SQL Editor de Neon.
-- ============================================================

-- Perfil del emisor (un solo registro, id = 1)
create table if not exists perfil (
  id              int primary key default 1,
  nombre          text,
  email           text,
  telefono        text,
  empresa         text,
  direccion       text,
  datos_bancarios text
);

-- Boletas / facturas
create table if not exists boletas (
  id             uuid primary key default gen_random_uuid(),
  numero         text not null,
  fecha          date not null,
  cuotas         int         default 1,
  subtotal       numeric     default 0,
  descuento      numeric     default 0,
  total          numeric     default 0,
  cliente_nombre text,
  cliente_email  text,
  cliente_tel    text,
  moneda         text        default 'AUD',
  notas          text,
  estado         text        default 'pendiente',  -- pendiente | cobrada | cancelada
  created_at     timestamptz default now()
);

-- Líneas de cada boleta
create table if not exists items_boleta (
  id              uuid primary key default gen_random_uuid(),
  boleta_id       uuid references boletas(id) on delete cascade,
  descripcion     text,
  cantidad        numeric default 1,
  precio_unitario numeric default 0
);

create index if not exists idx_items_boleta_id on items_boleta(boleta_id);
create index if not exists idx_boletas_created on boletas(created_at desc);
