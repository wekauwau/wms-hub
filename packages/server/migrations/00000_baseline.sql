-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enum types
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');

CREATE TYPE movement_type AS ENUM (
  'RECEIPT', 'PUTAWAY', 'PICK', 'PACK', 'SHIP',
  'ADJUSTMENT_ADD', 'ADJUSTMENT_REMOVE',
  'TRANSFER_OUT', 'TRANSFER_IN',
  'CYCLE_COUNT_ADJUSTMENT'
);

CREATE TYPE order_status AS ENUM (
  'PENDING', 'ALLOCATED', 'PICKING', 'PICKED',
  'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'
);

CREATE TYPE asn_status AS ENUM (
  'DRAFT', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED'
);

CREATE TYPE reservation_status AS ENUM ('ACTIVE', 'FULFILLED', 'RELEASED');

CREATE TYPE exception_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

CREATE TYPE exception_type AS ENUM (
  'SHORT_SHIPMENT', 'OVER_RECEIPT', 'DAMAGED_GOODS',
  'LOCATION_FULL', 'WRONG_ITEM', 'WRONG_LOCATION',
  'STOCK_DISCREPANCY', 'QUALITY_HOLD'
);

CREATE TYPE location_type AS ENUM ('WAREHOUSE', 'ZONE', 'AISLE', 'SHELF', 'BIN');

CREATE TYPE cycle_count_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'RECONCILED', 'CANCELLED');

CREATE TYPE adjustment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE transfer_status AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- Users & Auth
CREATE TABLE users (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email varchar(255) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  status user_status DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE roles (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(50) UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE permissions (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(100) UNIQUE NOT NULL,
  description text
);

CREATE TABLE user_roles (
  user_id int REFERENCES users (id) ON DELETE CASCADE,
  role_id int REFERENCES roles (id) ON DELETE CASCADE,
  warehouse_id int,
  PRIMARY KEY (user_id, role_id, warehouse_id)
);

CREATE TABLE role_permissions (
  role_id int REFERENCES roles (id) ON DELETE CASCADE,
  permission_id int REFERENCES permissions (id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Warehouses
CREATE TABLE warehouses (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code varchar(50) UNIQUE NOT NULL,
  name varchar(255) NOT NULL,
  address text,
  is_active boolean DEFAULT TRUE,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Locations (hierarchical with LTREE)
CREATE TABLE locations (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  warehouse_id int NOT NULL REFERENCES warehouses (id),
  code varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  type location_type NOT NULL,
  path ltree NOT NULL,
  parent_id int REFERENCES locations (id),
  capacity decimal(12, 4),
  capacity_unit varchar(20),
  is_active boolean DEFAULT TRUE,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE (warehouse_id, code)
);

CREATE INDEX idx_locations_path ON locations USING gist (path);
CREATE INDEX idx_locations_warehouse ON locations (warehouse_id);

-- SKUs
CREATE TABLE skus (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_code varchar(100) UNIQUE NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  category varchar(100),
  uom varchar(20) NOT NULL DEFAULT 'UNITS',
  weight decimal(10, 4),
  volume decimal(10, 6),
  is_active boolean DEFAULT TRUE,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_skus_code ON skus USING gin (sku_code gin_trgm_ops);
CREATE INDEX idx_skus_name ON skus USING gin (name gin_trgm_ops);

-- Inventory (Ledger + Current Stock)
CREATE TABLE inventory_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_id int NOT NULL REFERENCES skus (id),
  location_id int NOT NULL REFERENCES locations (id),
  warehouse_id int NOT NULL REFERENCES warehouses (id),
  quantity decimal(12, 4) NOT NULL,
  movement_type movement_type NOT NULL,
  reference_type varchar(50),
  reference_id int,
  reason_code varchar(50),
  notes text,
  created_by int NOT NULL REFERENCES users (id),
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_movements_sku ON inventory_movements (sku_id);
CREATE INDEX idx_movements_location ON inventory_movements (location_id);
CREATE INDEX idx_movements_warehouse ON inventory_movements (warehouse_id);
CREATE INDEX idx_movements_type ON inventory_movements (movement_type);
CREATE INDEX idx_movements_ref ON inventory_movements (reference_type, reference_id);
CREATE INDEX idx_movements_created ON inventory_movements (created_at);

CREATE TABLE current_stock (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_id int NOT NULL REFERENCES skus (id),
  location_id int NOT NULL REFERENCES locations (id),
  warehouse_id int NOT NULL REFERENCES warehouses (id),
  on_hand decimal(12, 4) NOT NULL DEFAULT 0,
  reserved decimal(12, 4) NOT NULL DEFAULT 0,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE (sku_id, location_id, warehouse_id)
);

CREATE INDEX idx_stock_sku ON current_stock (sku_id);
CREATE INDEX idx_stock_location ON current_stock (location_id);
CREATE INDEX idx_stock_warehouse ON current_stock (warehouse_id);

CREATE TABLE stock_reservations (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_id int NOT NULL REFERENCES skus (id),
  location_id int NOT NULL REFERENCES locations (id),
  warehouse_id int NOT NULL REFERENCES warehouses (id),
  sales_order_id int NOT NULL,
  quantity decimal(12, 4) NOT NULL,
  status reservation_status DEFAULT 'ACTIVE',
  expires_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_reservations_order ON stock_reservations (sales_order_id);
CREATE INDEX idx_reservations_sku ON stock_reservations (sku_id, status);
