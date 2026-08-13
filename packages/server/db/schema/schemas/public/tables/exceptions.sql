-- atlas:import ../public.sql

CREATE TABLE public.exceptions (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exception_type public.EXCEPTION_TYPE NOT NULL,
  status public.EXCEPTION_STATUS DEFAULT 'OPEN',
  reference_type VARCHAR(50),
  reference_id INT,
  warehouse_id INT NOT NULL REFERENCES public.warehouses (id),
  sku_id INT REFERENCES public.skus (id),
  location_id INT REFERENCES public.locations (id),
  description TEXT NOT NULL,
  resolution TEXT,
  raised_by INT NOT NULL REFERENCES public.users (id),
  resolved_by INT REFERENCES public.users (id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
