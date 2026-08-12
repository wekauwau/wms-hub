-- atlas:import ../public.sql

CREATE TYPE public.location_type AS ENUM ('WAREHOUSE', 'ZONE', 'AISLE', 'SHELF', 'BIN');
