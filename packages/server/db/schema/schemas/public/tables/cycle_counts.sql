-- atlas:import ../public.sql

CREATE TABLE public.cycle_counts (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  count_number VARCHAR(50) UNIQUE NOT NULL,
  warehouse_id INT NOT NULL REFERENCES public.warehouses (id),
  location_id INT REFERENCES public.locations (id),
  status public.CYCLE_COUNT_STATUS DEFAULT 'DRAFT',
  initiated_by INT NOT NULL REFERENCES public.users (id),
  reconciled_by INT REFERENCES public.users (id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reconciled_at TIMESTAMPTZ
);
