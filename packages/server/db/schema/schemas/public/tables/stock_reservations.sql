-- atlas:import ../public.sql

-- Links unfulfilled order lines to reserved stock
CREATE TABLE public.stock_reservations (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_id INT NOT NULL REFERENCES public.skus (id),
  location_id INT NOT NULL REFERENCES public.locations (id),
  warehouse_id INT NOT NULL REFERENCES public.warehouses (id),
  sales_order_id INT NOT NULL,
  quantity DECIMAL(12, 4) NOT NULL,
  status public.RESERVATION_STATUS DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_order ON public.stock_reservations (sales_order_id);
CREATE INDEX idx_reservations_sku ON public.stock_reservations (sku_id, status);
