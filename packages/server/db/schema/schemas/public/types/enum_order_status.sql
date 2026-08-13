-- atlas:import ../public.sql

CREATE TYPE public.order_status AS ENUM (
  'PENDING', 'ALLOCATED', 'PICKING', 'PICKED',
  'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'
);
