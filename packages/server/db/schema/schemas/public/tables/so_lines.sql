-- atlas:import ../public.sql

CREATE TABLE public.so_lines (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  so_id INT NOT NULL REFERENCES public.sales_orders (id) ON DELETE CASCADE,
  sku_id INT NOT NULL REFERENCES public.skus (id),
  requested_quantity DECIMAL(12, 4) NOT NULL,
  allocated_quantity DECIMAL(12, 4) DEFAULT 0,
  picked_quantity DECIMAL(12, 4) DEFAULT 0,
  packed_quantity DECIMAL(12, 4) DEFAULT 0,
  shipped_quantity DECIMAL(12, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
