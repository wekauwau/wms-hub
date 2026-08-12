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

-- Inbound Pipeline
CREATE TABLE purchase_orders (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_number varchar(50) UNIQUE NOT NULL,
  warehouse_id int NOT NULL REFERENCES warehouses (id),
  supplier_name varchar(255),
  expected_date date,
  status asn_status DEFAULT 'DRAFT',
  notes text,
  created_by int NOT NULL REFERENCES users (id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE po_lines (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id int NOT NULL REFERENCES purchase_orders (id) ON DELETE CASCADE,
  sku_id int NOT NULL REFERENCES skus (id),
  expected_quantity decimal(12, 4) NOT NULL,
  received_quantity decimal(12, 4) DEFAULT 0,
  unit_cost decimal(12, 4),
  created_at timestamptz DEFAULT NOW()
);

-- Outbound Pipeline
CREATE TABLE sales_orders (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number varchar(50) UNIQUE NOT NULL,
  warehouse_id int NOT NULL REFERENCES warehouses (id),
  customer_name varchar(255),
  customer_address text,
  status order_status DEFAULT 'PENDING',
  priority int DEFAULT 0,
  notes text,
  created_by int NOT NULL REFERENCES users (id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE so_lines (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  so_id int NOT NULL REFERENCES sales_orders (id) ON DELETE CASCADE,
  sku_id int NOT NULL REFERENCES skus (id),
  requested_quantity decimal(12, 4) NOT NULL,
  allocated_quantity decimal(12, 4) DEFAULT 0,
  picked_quantity decimal(12, 4) DEFAULT 0,
  packed_quantity decimal(12, 4) DEFAULT 0,
  shipped_quantity decimal(12, 4) DEFAULT 0,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE pick_tasks (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  so_id int NOT NULL REFERENCES sales_orders (id),
  so_line_id int NOT NULL REFERENCES so_lines (id),
  sku_id int NOT NULL REFERENCES skus (id),
  location_id int NOT NULL REFERENCES locations (id),
  warehouse_id int NOT NULL REFERENCES warehouses (id),
  expected_quantity decimal(12, 4) NOT NULL,
  picked_quantity decimal(12, 4) DEFAULT 0,
  assignee_id int REFERENCES users (id),
  status varchar(50) DEFAULT 'PENDING',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE shipments (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shipment_number varchar(50) UNIQUE NOT NULL,
  so_id int NOT NULL REFERENCES sales_orders (id),
  warehouse_id int NOT NULL REFERENCES warehouses (id),
  carrier varchar(100),
  tracking_number varchar(255),
  shipped_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE shipment_items (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shipment_id int NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  so_line_id int NOT NULL REFERENCES so_lines (id),
  quantity decimal(12, 4) NOT NULL
);

-- Supporting Workflows
CREATE TABLE cycle_counts (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  count_number varchar(50) UNIQUE NOT NULL,
  warehouse_id int NOT NULL REFERENCES warehouses (id),
  location_id int REFERENCES locations (id),
  status cycle_count_status DEFAULT 'DRAFT',
  initiated_by int NOT NULL REFERENCES users (id),
  reconciled_by int REFERENCES users (id),
  created_at timestamptz DEFAULT NOW(),
  reconciled_at timestamptz
);

CREATE TABLE cycle_count_lines (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cycle_count_id int NOT NULL REFERENCES cycle_counts (id) ON DELETE CASCADE,
  sku_id int NOT NULL REFERENCES skus (id),
  location_id int NOT NULL REFERENCES locations (id),
  expected_quantity decimal(12, 4) NOT NULL,
  counted_quantity decimal(12, 4),
  variance decimal(12, 4) GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED,
  counted_by int REFERENCES users (id),
  counted_at timestamptz
);

CREATE TABLE stock_adjustments (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  adjustment_number varchar(50) UNIQUE NOT NULL,
  warehouse_id int NOT NULL REFERENCES warehouses (id),
  sku_id int NOT NULL REFERENCES skus (id),
  location_id int NOT NULL REFERENCES locations (id),
  quantity_change decimal(12, 4) NOT NULL,
  reason_code varchar(50) NOT NULL,
  notes text,
  status adjustment_status DEFAULT 'PENDING',
  requested_by int NOT NULL REFERENCES users (id),
  approved_by int REFERENCES users (id),
  created_at timestamptz DEFAULT NOW(),
  approved_at timestamptz
);

CREATE TABLE stock_transfers (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transfer_number varchar(50) UNIQUE NOT NULL,
  sku_id int NOT NULL REFERENCES skus (id),
  from_warehouse_id int NOT NULL REFERENCES warehouses (id),
  from_location_id int NOT NULL REFERENCES locations (id),
  to_warehouse_id int NOT NULL REFERENCES warehouses (id),
  to_location_id int NOT NULL REFERENCES locations (id),
  quantity decimal(12, 4) NOT NULL,
  status transfer_status DEFAULT 'PENDING',
  requested_by int NOT NULL REFERENCES users (id),
  completed_by int REFERENCES users (id),
  created_at timestamptz DEFAULT NOW(),
  completed_at timestamptz
);

CREATE TABLE exceptions (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exception_type exception_type NOT NULL,
  status exception_status DEFAULT 'OPEN',
  reference_type varchar(50),
  reference_id int,
  warehouse_id int NOT NULL REFERENCES warehouses (id),
  sku_id int REFERENCES skus (id),
  location_id int REFERENCES locations (id),
  description text NOT NULL,
  resolution text,
  raised_by int NOT NULL REFERENCES users (id),
  resolved_by int REFERENCES users (id),
  created_at timestamptz DEFAULT NOW(),
  resolved_at timestamptz
);

CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type varchar(50) NOT NULL,
  entity_id int NOT NULL,
  action varchar(20) NOT NULL,
  old_values jsonb,
  new_values jsonb,
  user_id int REFERENCES users (id),
  ip_address inet,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs (user_id);
CREATE INDEX idx_audit_created ON audit_logs (created_at);

-- Trigger Functions

-- 1. Auto-update current_stock on inventory_movements insert
CREATE OR REPLACE FUNCTION FN_UPDATE_CURRENT_STOCK()
RETURNS trigger AS $$
BEGIN
  INSERT INTO current_stock (sku_id, location_id, warehouse_id, on_hand, version)
  VALUES (NEW.sku_id, NEW.location_id, NEW.warehouse_id, NEW.quantity, 1)
  ON CONFLICT (sku_id, location_id, warehouse_id)
  DO UPDATE SET
    on_hand = current_stock.on_hand + NEW.quantity,
    version = current_stock.version + 1,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_current_stock
AFTER INSERT ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION FN_UPDATE_CURRENT_STOCK();

-- 2. Auto-update reserved on stock_reservations changes
CREATE OR REPLACE FUNCTION FN_UPDATE_STOCK_RESERVED()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'ACTIVE' THEN
    UPDATE current_stock
    SET reserved = reserved + NEW.quantity,
        version = version + 1,
        updated_at = NOW()
    WHERE sku_id = NEW.sku_id
      AND location_id = NEW.location_id
      AND warehouse_id = NEW.warehouse_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'ACTIVE' AND NEW.status != 'ACTIVE' THEN
      UPDATE current_stock
      SET reserved = reserved - OLD.quantity,
          version = version + 1,
          updated_at = NOW()
      WHERE sku_id = OLD.sku_id
        AND location_id = OLD.location_id
        AND warehouse_id = OLD.warehouse_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'ACTIVE' THEN
    UPDATE current_stock
    SET reserved = reserved - OLD.quantity,
        version = version + 1,
        updated_at = NOW()
    WHERE sku_id = OLD.sku_id
      AND location_id = OLD.location_id
      AND warehouse_id = OLD.warehouse_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock_reserved
AFTER INSERT OR UPDATE OR DELETE ON stock_reservations
FOR EACH ROW
EXECUTE FUNCTION FN_UPDATE_STOCK_RESERVED();

-- 3. Auto-update updated_at on all relevant tables
CREATE OR REPLACE FUNCTION FN_UPDATE_UPDATED_AT()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION FN_UPDATE_UPDATED_AT();
CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON warehouses
FOR EACH ROW EXECUTE FUNCTION FN_UPDATE_UPDATED_AT();
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION FN_UPDATE_UPDATED_AT();
CREATE TRIGGER trg_skus_updated_at BEFORE UPDATE ON skus
FOR EACH ROW EXECUTE FUNCTION FN_UPDATE_UPDATED_AT();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION FN_UPDATE_UPDATED_AT();
CREATE TRIGGER trg_sales_orders_updated_at BEFORE UPDATE ON sales_orders
FOR EACH ROW EXECUTE FUNCTION FN_UPDATE_UPDATED_AT();

-- 4. Audit trail trigger (generic, for important tables)
CREATE OR REPLACE FUNCTION FN_AUDIT_LOG()
RETURNS trigger AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_data := to_jsonb(NEW);
    INSERT INTO audit_logs (entity_type, entity_id, action, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', new_data,
            current_setting('app.current_user_id', TRUE)::INT);
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    INSERT INTO audit_logs (entity_type, entity_id, action, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', old_data, new_data,
            current_setting('app.current_user_id', TRUE)::INT);
  ELSIF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    INSERT INTO audit_logs (entity_type, entity_id, action, old_values, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_data,
            current_setting('app.current_user_id', TRUE)::INT);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_users AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION FN_AUDIT_LOG();
CREATE TRIGGER trg_audit_purchase_orders AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION FN_AUDIT_LOG();
CREATE TRIGGER trg_audit_sales_orders AFTER INSERT OR UPDATE OR DELETE ON sales_orders
FOR EACH ROW EXECUTE FUNCTION FN_AUDIT_LOG();
CREATE TRIGGER trg_audit_stock_adjustments AFTER INSERT OR UPDATE OR DELETE ON stock_adjustments
FOR EACH ROW EXECUTE FUNCTION FN_AUDIT_LOG();

-- Business Logic Functions

-- 1. Allocate stock for a sales order line (with row-level locking)
CREATE OR REPLACE FUNCTION ALLOCATE_STOCK(
  p_sku_id int,
  p_warehouse_id int,
  p_quantity decimal(12, 4),
  p_sales_order_id int
)
RETURNS TABLE (allocated_quantity decimal(12, 4), location_id int) AS $$
DECLARE
  v_remaining DECIMAL(12,4) := p_quantity;
  v_available DECIMAL(12,4);
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT cs.id, cs.location_id, cs.on_hand, cs.reserved
    FROM current_stock cs
    WHERE cs.sku_id = p_sku_id
      AND cs.warehouse_id = p_warehouse_id
      AND (cs.on_hand - cs.reserved) > 0
    ORDER BY cs.id ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    PERFORM 1 FROM current_stock
    WHERE id = rec.id
    FOR UPDATE;

    v_available := rec.on_hand - rec.reserved;

    IF v_available >= v_remaining THEN
      INSERT INTO stock_reservations (sku_id, location_id, warehouse_id, sales_order_id, quantity)
      VALUES (p_sku_id, rec.location_id, p_warehouse_id, p_sales_order_id, v_remaining);
      allocated_quantity := v_remaining;
      location_id := rec.location_id;
      RETURN NEXT;
      v_remaining := 0;
    ELSE
      INSERT INTO stock_reservations (sku_id, location_id, warehouse_id, sales_order_id, quantity)
      VALUES (p_sku_id, rec.location_id, p_warehouse_id, p_sales_order_id, v_available);
      allocated_quantity := v_available;
      location_id := rec.location_id;
      RETURN NEXT;
      v_remaining := v_remaining - v_available;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Suggest putaway location
CREATE OR REPLACE FUNCTION SUGGEST_PUTAWAY_LOCATION(
  p_sku_id int,
  p_warehouse_id int
)
RETURNS TABLE (location_id int, location_code varchar, reason text) AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.code, 'CONSOLIDATION'::TEXT
  FROM current_stock cs
  JOIN locations l ON l.id = cs.location_id
  WHERE cs.sku_id = p_sku_id
    AND cs.warehouse_id = p_warehouse_id
    AND l.type = 'BIN'
    AND l.is_active = TRUE
    AND (cs.on_hand - cs.reserved) > 0
    AND (l.capacity IS NULL OR cs.on_hand < l.capacity)
  ORDER BY (cs.on_hand - cs.reserved) DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT l.id, l.code, 'EMPTY_BIN'::TEXT
    FROM locations l
    WHERE l.warehouse_id = p_warehouse_id
      AND l.type = 'BIN'
      AND l.is_active = TRUE
      AND l.capacity IS NULL
    ORDER BY l.path
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;
