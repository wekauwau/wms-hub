-- atlas:import ../public.sql

CREATE TYPE public.reservation_status AS ENUM ('ACTIVE', 'FULFILLED', 'RELEASED');
