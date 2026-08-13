-- atlas:import ../public.sql

CREATE TYPE public.exception_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
