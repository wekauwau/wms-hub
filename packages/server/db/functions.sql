-- Business Logic Functions

-- 1. Allocate stock for a sales order line (with row-level locking)
CREATE OR REPLACE FUNCTION allocate_stock(
  p_sku_id INT,
  p_warehouse_id INT,
  p_quantity DECIMAL(12, 4),
  p_sales_order_id INT
)
RETURNS TABLE (allocated_quantity DECIMAL(12, 4), location_id INT) AS $$
DECLARE
  v_remaining DECIMAL(12,4) := p_quantity;
  v_available DECIMAL(12,4);
  rec RECORD;
BEGIN
  -- Iterate through locations ordered by FIFO (oldest stock first)
  FOR rec IN
    SELECT cs.id, cs.location_id, cs.on_hand, cs.reserved
    FROM current_stock cs
    WHERE cs.sku_id = p_sku_id
      AND cs.warehouse_id = p_warehouse_id
      AND (cs.on_hand - cs.reserved) > 0
    ORDER BY cs.id ASC -- FIFO: oldest stock first
  LOOP
    EXIT WHEN v_remaining <= 0;

    -- Lock the row for update
    PERFORM 1 FROM current_stock
    WHERE id = rec.id
    FOR UPDATE;

    v_available := rec.on_hand - rec.reserved;

    IF v_available >= v_remaining THEN
      -- Can fulfill entirely from this location
      INSERT INTO stock_reservations (sku_id, location_id, warehouse_id, sales_order_id, quantity)
      VALUES (p_sku_id, rec.location_id, p_warehouse_id, p_sales_order_id, v_remaining);
      allocated_quantity := v_remaining;
      location_id := rec.location_id;
      RETURN NEXT;
      v_remaining := 0;
    ELSE
      -- Partial allocation from this location
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
CREATE OR REPLACE FUNCTION suggest_putaway_location(
  p_sku_id INT,
  p_warehouse_id INT
)
RETURNS TABLE (location_id INT, location_code VARCHAR, reason TEXT) AS $$
BEGIN
  -- Strategy 1: Find a bin with existing stock of same SKU (consolidation)
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

  -- If no consolidation candidate, return empty bin
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT l.id, l.code, 'EMPTY_BIN'::TEXT
    FROM locations l
    WHERE l.warehouse_id = p_warehouse_id
      AND l.type = 'BIN'
      AND l.is_active = TRUE
      AND l.capacity IS NULL -- unlimited for MVP
    ORDER BY l.path
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;
