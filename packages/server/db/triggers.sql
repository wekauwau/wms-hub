-- Trigger Functions

-- 1. Auto-update current_stock on inventory_movements insert
CREATE OR REPLACE FUNCTION fn_update_current_stock()
RETURNS TRIGGER AS $$
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
EXECUTE FUNCTION fn_update_current_stock();

-- 2. Auto-update reserved on stock_reservations changes
CREATE OR REPLACE FUNCTION fn_update_stock_reserved()
RETURNS TRIGGER AS $$
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
EXECUTE FUNCTION fn_update_stock_reserved();

-- 3. Auto-update updated_at on all relevant tables
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON warehouses
FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_skus_updated_at BEFORE UPDATE ON skus
FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_sales_orders_updated_at BEFORE UPDATE ON sales_orders
FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- 4. Audit trail trigger (generic, for important tables)
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
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
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_purchase_orders AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_sales_orders AFTER INSERT OR UPDATE OR DELETE ON sales_orders
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_stock_adjustments AFTER INSERT OR UPDATE OR DELETE ON stock_adjustments
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
