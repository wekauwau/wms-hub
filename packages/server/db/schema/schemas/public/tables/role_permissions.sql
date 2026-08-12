-- atlas:import ../public.sql

CREATE TABLE public.role_permissions (
  role_id INT REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
