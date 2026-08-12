-- atlas:import ../public.sql

CREATE TYPE public.cycle_count_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'RECONCILED', 'CANCELLED');
