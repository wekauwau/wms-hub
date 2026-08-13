-- atlas:import ../public.sql

CREATE TABLE public.shipment_items (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shipment_id INT NOT NULL REFERENCES public.shipments (id) ON DELETE CASCADE,
  so_line_id INT NOT NULL REFERENCES public.so_lines (id),
  quantity DECIMAL(12, 4) NOT NULL
);
