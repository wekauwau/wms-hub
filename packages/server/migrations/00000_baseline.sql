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
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  status user_status DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE user_roles (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  warehouse_id INT,
  PRIMARY KEY (user_id, role_id, warehouse_id)
);

CREATE TABLE role_permissions (
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Warehouses
CREATE TABLE warehouses (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations (hierarchical with LTREE)
CREATE TABLE locations (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  warehouse_id INT NOT NULL REFERENCES warehouses(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type location_type NOT NULL,
  path ltree NOT NULL,
  parent_id INT REFERENCES locations(id),
  capacity DECIMAL(12,4),
  capacity_unit VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (warehouse_id, code)
);

CREATE INDEX idx_locations_path ON locations USING gist (path);
CREATE INDEX idx_locations_warehouse ON locations (warehouse_id);

-- SKUs
CREATE TABLE skus (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  uom VARCHAR(20) NOT NULL DEFAULT 'UNITS',
  weight DECIMAL(10,4),
  volume DECIMAL(10,6),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skus_code ON skus USING gin (sku_code gin_trgm_ops);
CREATE INDEX idx_skus_name ON skus USING gin (name gin_trgm_ops);

-- Inventory (Ledger + Current Stock)
CREATE TABLE inventory_movements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_id INT NOT NULL REFERENCES skus(id),
  location_id INT NOT NULL REFERENCES locations(id),
  warehouse_id INT NOT NULL REFERENCES warehouses(id),
  quantity DECIMAL(12,4) NOT NULL,
  movement_type movement_type NOT NULL,
  reference_type VARCHAR(50),
  reference_id INT,
  reason_code VARCHAR(50),
  notes TEXT,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movements_sku ON inventory_movements (sku_id);
CREATE INDEX idx_movements_location ON inventory_movements (location_id);
CREATE INDEX idx_movements_warehouse ON inventory_movements (warehouse_id);
CREATE INDEX idx_movements_type ON inventory_movements (movement_type);
CREATE INDEX idx_movements_ref ON inventory_movements (reference_type, reference_id);
CREATE INDEX idx_movements_created ON inventory_movements (created_at);

CREATE TABLE current_stock (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_id INT NOT NULL REFERENCES skus(id),
  location_id INT NOT NULL REFERENCES locations(id),
  warehouse_id INT NOT NULL REFERENCES warehouses(id),
  on_hand DECIMAL(12,4) NOT NULL DEFAULT 0,
  reserved DECIMAL(12,4) NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sku_id, location_id, warehouse_id)
);

CREATE INDEX idx_stock_sku ON current_stock (sku_id);
CREATE INDEX idx_stock_location ON current_stock (location_id);
CREATE INDEX idx_stock_warehouse ON current_stock (warehouse_id);

CREATE TABLE stock_reservations (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_id INT NOT NULL REFERENCES skus(id),
  location_id INT NOT NULL REFERENCES locations(id),
  warehouse_id INT NOT NULL REFERENCES warehouses(id),
  sales_order_id INT NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  status reservation_status DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_order ON stock_reservations (sales_order_id);
CREATE INDEX idx_reservations_sku ON stock_reservations (sku_id, status);
