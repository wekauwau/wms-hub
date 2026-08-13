-- atlas:import ../public.sql

CREATE TYPE public.transfer_status AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');
