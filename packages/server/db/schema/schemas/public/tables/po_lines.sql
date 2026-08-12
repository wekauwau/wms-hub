-- atlas:import ../public.sql

CREATE TABLE public.po_lines (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id INT NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  sku_id INT NOT NULL REFERENCES public.skus (id),
  expected_quantity DECIMAL(12, 4) NOT NULL,
  received_quantity DECIMAL(12, 4) DEFAULT 0,
  unit_cost DECIMAL(12, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
