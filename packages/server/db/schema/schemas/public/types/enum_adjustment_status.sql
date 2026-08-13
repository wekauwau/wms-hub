-- atlas:import ../public.sql

CREATE TYPE public.adjustment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
