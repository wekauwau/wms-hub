-- atlas:import ../public.sql

CREATE TABLE public.shipments (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shipment_number VARCHAR(50) UNIQUE NOT NULL,
  so_id INT NOT NULL REFERENCES public.sales_orders (id),
  warehouse_id INT NOT NULL REFERENCES public.warehouses (id),
  carrier VARCHAR(100),
  tracking_number VARCHAR(255),
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
