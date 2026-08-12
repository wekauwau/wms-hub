-- atlas:import ../public.sql

CREATE TABLE public.skus (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  uom VARCHAR(20) NOT NULL DEFAULT 'UNITS',
  weight DECIMAL(10,4),
  volume DECIMAL(10,6),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GIN trigram indexes require pg_trgm extension (applied via migration).
-- Not supported by Atlas declarative schema (requires Pro).
CREATE INDEX idx_skus_code ON public.skus USING gin (sku_code gin_trgm_ops);
CREATE INDEX idx_skus_name ON public.skus USING gin (name gin_trgm_ops);
