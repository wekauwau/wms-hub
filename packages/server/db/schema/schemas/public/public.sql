CREATE SCHEMA IF NOT EXISTS public;

-- Extensions are not supported by Atlas declarative schema (requires Pro).
-- They are applied via versioned migration (00000_baseline.sql).
-- Uncomment locally if running schema directly against a database with extensions.
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CREATE EXTENSION IF NOT EXISTS "ltree";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";
