-- atlas:import ../public.sql

CREATE TABLE public.cycle_count_lines (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cycle_count_id INT NOT NULL REFERENCES public.cycle_counts (id) ON DELETE CASCADE,
  sku_id INT NOT NULL REFERENCES public.skus (id),
  location_id INT NOT NULL REFERENCES public.locations (id),
  expected_quantity DECIMAL(12, 4) NOT NULL,
  counted_quantity DECIMAL(12, 4),
  variance DECIMAL(12, 4) GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED,
  counted_by INT REFERENCES public.users (id),
  counted_at TIMESTAMPTZ
);
