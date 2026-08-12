-- atlas:import ../public.sql

CREATE TYPE public.asn_status AS ENUM (
  'DRAFT', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED'
);
