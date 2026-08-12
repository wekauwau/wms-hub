-- atlas:import ../public.sql

-- Append-only ledger: every inventory change is a row here
CREATE TABLE public.inventory_movements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_id INT NOT NULL REFERENCES public.skus(id),
  location_id INT NOT NULL REFERENCES public.locations(id),
  warehouse_id INT NOT NULL REFERENCES public.warehouses(id),
  quantity DECIMAL(12,4) NOT NULL, -- positive = inbound, negative = outbound
  movement_type public.movement_type NOT NULL,
  reference_type VARCHAR(50), -- 'PURCHASE_ORDER', 'SALES_ORDER', 'ADJUSTMENT', etc.
  reference_id INT,
  reason_code VARCHAR(50),
  notes TEXT,
  created_by INT NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movements_sku ON public.inventory_movements (sku_id);
CREATE INDEX idx_movements_location ON public.inventory_movements (location_id);
CREATE INDEX idx_movements_warehouse ON public.inventory_movements (warehouse_id);
CREATE INDEX idx_movements_type ON public.inventory_movements (movement_type);
CREATE INDEX idx_movements_ref ON public.inventory_movements (reference_type, reference_id);
CREATE INDEX idx_movements_created ON public.inventory_movements (created_at);
