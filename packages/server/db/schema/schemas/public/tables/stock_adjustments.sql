-- atlas:import ../public.sql

CREATE TABLE public.stock_adjustments (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  adjustment_number VARCHAR(50) UNIQUE NOT NULL,
  warehouse_id INT NOT NULL REFERENCES public.warehouses (id),
  sku_id INT NOT NULL REFERENCES public.skus (id),
  location_id INT NOT NULL REFERENCES public.locations (id),
  quantity_change DECIMAL(12, 4) NOT NULL,
  reason_code VARCHAR(50) NOT NULL,
  notes TEXT,
  status public.ADJUSTMENT_STATUS DEFAULT 'PENDING',
  requested_by INT NOT NULL REFERENCES public.users (id),
  approved_by INT REFERENCES public.users (id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);
