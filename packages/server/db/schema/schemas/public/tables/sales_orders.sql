-- atlas:import ../public.sql

CREATE TABLE public.sales_orders (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  warehouse_id INT NOT NULL REFERENCES public.warehouses (id),
  customer_name VARCHAR(255),
  customer_address TEXT,
  status public.ORDER_STATUS DEFAULT 'PENDING',
  priority INT DEFAULT 0,
  notes TEXT,
  created_by INT NOT NULL REFERENCES public.users (id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
