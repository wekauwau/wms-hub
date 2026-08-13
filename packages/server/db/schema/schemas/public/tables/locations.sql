-- atlas:import ../public.sql

-- LTREE path column requires ltree extension (applied via migration).
-- Not supported by Atlas declarative schema (requires Pro).
CREATE TABLE public.locations (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  warehouse_id INT NOT NULL REFERENCES public.warehouses (id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type public.LOCATION_TYPE NOT NULL,
  path LTREE NOT NULL,
  parent_id INT REFERENCES public.locations (id),
  capacity DECIMAL(12, 4),
  capacity_unit VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (warehouse_id, code)
);

CREATE INDEX idx_locations_path ON public.locations USING gist (path);
CREATE INDEX idx_locations_warehouse ON public.locations (warehouse_id);
