-- atlas:import ../public.sql

CREATE TABLE public.user_roles (
  user_id INT REFERENCES public.users (id) ON DELETE CASCADE,
  role_id INT REFERENCES public.roles (id) ON DELETE CASCADE,
  warehouse_id INT,
  PRIMARY KEY (user_id, role_id, warehouse_id)
);
