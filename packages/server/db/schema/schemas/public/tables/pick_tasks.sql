-- atlas:import ../public.sql

CREATE TABLE public.pick_tasks (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  so_id INT NOT NULL REFERENCES public.sales_orders (id),
  so_line_id INT NOT NULL REFERENCES public.so_lines (id),
  sku_id INT NOT NULL REFERENCES public.skus (id),
  location_id INT NOT NULL REFERENCES public.locations (id),
  warehouse_id INT NOT NULL REFERENCES public.warehouses (id),
  expected_quantity DECIMAL(12, 4) NOT NULL,
  picked_quantity DECIMAL(12, 4) DEFAULT 0,
  assignee_id INT REFERENCES public.users (id),
  status VARCHAR(50) DEFAULT 'PENDING',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
