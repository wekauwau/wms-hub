-- atlas:import ../public.sql

CREATE TYPE public.user_status AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');
