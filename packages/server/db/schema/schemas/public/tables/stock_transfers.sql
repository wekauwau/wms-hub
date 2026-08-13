-- atlas:import ../public.sql

CREATE TABLE public.stock_transfers (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  sku_id INT NOT NULL REFERENCES public.skus (id),
  from_warehouse_id INT NOT NULL REFERENCES public.warehouses (id),
  from_location_id INT NOT NULL REFERENCES public.locations (id),
  to_warehouse_id INT NOT NULL REFERENCES public.warehouses (id),
  to_location_id INT NOT NULL REFERENCES public.locations (id),
  quantity DECIMAL(12, 4) NOT NULL,
  status public.TRANSFER_STATUS DEFAULT 'PENDING',
  requested_by INT NOT NULL REFERENCES public.users (id),
  completed_by INT REFERENCES public.users (id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
