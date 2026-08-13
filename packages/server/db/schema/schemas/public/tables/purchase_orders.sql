-- atlas:import ../public.sql

CREATE TABLE public.purchase_orders (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  warehouse_id INT NOT NULL REFERENCES public.warehouses (id),
  supplier_name VARCHAR(255),
  expected_date DATE,
  status public.ASN_STATUS DEFAULT 'DRAFT',
  notes TEXT,
  created_by INT NOT NULL REFERENCES public.users (id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
