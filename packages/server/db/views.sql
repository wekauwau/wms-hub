-- Analytical Views

-- Dashboard KPIs
CREATE OR REPLACE VIEW v_dashboard_kpi AS
SELECT
  w.id AS warehouse_id,
  w.code AS warehouse_code,
  COUNT(DISTINCT cs.sku_id) AS total_skus,
  SUM(cs.on_hand) AS total_units_on_hand,
  SUM(cs.reserved) AS total_units_reserved,
  SUM(cs.on_hand - cs.reserved) AS total_units_available,
  (
    SELECT COUNT(*) FROM sales_orders AS so
    WHERE so.warehouse_id = w.id AND so.status NOT IN ('SHIPPED', 'DELIVERED', 'CANCELLED'))
    AS open_orders,
  (
    SELECT COUNT(*) FROM purchase_orders AS po
    WHERE po.warehouse_id = w.id AND po.status NOT IN ('RECEIVED', 'CLOSED', 'CANCELLED'))
    AS open_pos,
  (
    SELECT COUNT(*) FROM exceptions AS e
    WHERE e.warehouse_id = w.id AND e.status IN ('OPEN', 'IN_PROGRESS'))
    AS open_exceptions
FROM warehouses AS w
LEFT JOIN current_stock AS cs ON w.id = cs.warehouse_id
WHERE w.is_active = TRUE
GROUP BY w.id, w.code;

-- Location capacity usage
CREATE OR REPLACE VIEW v_location_usage AS
SELECT
  l.id AS location_id,
  l.code AS location_code,
  l.type AS location_type,
  l.capacity,
  l.capacity_unit,
  COALESCE(SUM(cs.on_hand), 0) AS current_units,
  CASE
    WHEN l.capacity IS NULL THEN NULL
    WHEN l.capacity = 0 THEN 100
    ELSE ROUND((COALESCE(SUM(cs.on_hand), 0) / l.capacity * 100)::NUMERIC, 1)
  END AS utilization_pct
FROM locations AS l
LEFT JOIN current_stock AS cs ON l.id = cs.location_id
WHERE l.type = 'BIN'
GROUP BY l.id, l.code, l.type, l.capacity, l.capacity_unit;

-- Stock summary by SKU across warehouse
CREATE OR REPLACE VIEW v_stock_summary AS
SELECT
  s.id AS sku_id,
  s.sku_code,
  s.name AS sku_name,
  w.id AS warehouse_id,
  w.code AS warehouse_code,
  SUM(cs.on_hand) AS total_on_hand,
  SUM(cs.reserved) AS total_reserved,
  SUM(cs.on_hand - cs.reserved) AS total_available,
  COUNT(DISTINCT cs.location_id) AS location_count
FROM skus AS s
CROSS JOIN warehouses AS w
LEFT JOIN current_stock AS cs ON s.id = cs.sku_id AND w.id = cs.warehouse_id
WHERE s.is_active = TRUE AND w.is_active = TRUE
GROUP BY s.id, s.sku_code, s.name, w.id, w.code;
