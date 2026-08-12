-- atlas:import ../public.sql

-- Maintained by trigger (fn_update_current_stock), queried for real-time levels
CREATE TABLE public.current_stock (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_id INT NOT NULL REFERENCES public.skus(id),
  location_id INT NOT NULL REFERENCES public.locations(id),
  warehouse_id INT NOT NULL REFERENCES public.warehouses(id),
  on_hand DECIMAL(12,4) NOT NULL DEFAULT 0,
  reserved DECIMAL(12,4) NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sku_id, location_id, warehouse_id)
);

CREATE INDEX idx_stock_sku ON public.current_stock (sku_id);
CREATE INDEX idx_stock_location ON public.current_stock (location_id);
CREATE INDEX idx_stock_warehouse ON public.current_stock (warehouse_id);
