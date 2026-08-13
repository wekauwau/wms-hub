-- atlas:import ../public.sql

CREATE TYPE public.movement_type AS ENUM (
  'RECEIPT', 'PUTAWAY', 'PICK', 'PACK', 'SHIP',
  'ADJUSTMENT_ADD', 'ADJUSTMENT_REMOVE',
  'TRANSFER_OUT', 'TRANSFER_IN',
  'CYCLE_COUNT_ADJUSTMENT'
);
