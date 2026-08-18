-- Seed sample sales orders and lines

INSERT INTO sales_orders (order_number, warehouse_id, customer_name, customer_address, status, priority, notes, created_by)
SELECT
  'SO-2001' AS order_number,
  w.id AS warehouse_id,
  'Beta Retail Group' AS customer_name,
  '456 Commerce Ave, Springfield' AS customer_address,
  'PENDING' AS status,
  1 AS priority,
  'Seeded demo SO' AS notes,
  u.id AS created_by
FROM warehouses AS w, users AS u
WHERE w.code = 'WH-MAIN' AND u.email = 'operator@wms.local'
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO sales_orders (order_number, warehouse_id, customer_name, customer_address, status, priority, notes, created_by)
SELECT
  'SO-2002' AS order_number,
  w.id AS warehouse_id,
  'Corner Market' AS customer_name,
  '789 Main St, Springfield' AS customer_address,
  'ALLOCATED' AS status,
  2 AS priority,
  'Seeded demo SO' AS notes,
  u.id AS created_by
FROM warehouses AS w, users AS u
WHERE w.code = 'WH-MAIN' AND u.email = 'operator@wms.local'
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO sales_orders (order_number, warehouse_id, customer_name, customer_address, status, priority, notes, created_by)
SELECT
  'SO-2003' AS order_number,
  w.id AS warehouse_id,
  'Beta Retail Group' AS customer_name,
  '456 Commerce Ave, Springfield' AS customer_address,
  'PICKED' AS status,
  1 AS priority,
  'Seeded demo SO' AS notes,
  u.id AS created_by
FROM warehouses AS w, users AS u
WHERE w.code = 'WH-MAIN' AND u.email = 'manager@wms.local'
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO sales_orders (order_number, warehouse_id, customer_name, customer_address, status, priority, notes, created_by)
SELECT
  'SO-2004' AS order_number,
  w.id AS warehouse_id,
  'Delta Distributors' AS customer_name,
  '101 Industrial Pkwy, Springfield' AS customer_address,
  'SHIPPED' AS status,
  3 AS priority,
  'Seeded demo SO' AS notes,
  u.id AS created_by
FROM warehouses AS w, users AS u
WHERE w.code = 'WH-MAIN' AND u.email = 'manager@wms.local'
ON CONFLICT (order_number) DO NOTHING;

-- SO-2001 lines (PENDING)
INSERT INTO so_lines (so_id, sku_id, requested_quantity, allocated_quantity, picked_quantity, shipped_quantity)
SELECT
  so.id AS so_id,
  s.id AS sku_id,
  100 AS requested_quantity,
  0 AS allocated_quantity,
  0 AS picked_quantity,
  0 AS shipped_quantity
FROM sales_orders AS so, skus AS s
WHERE
  so.order_number = 'SO-2001' AND s.sku_code = 'SKU-1001'
  AND NOT EXISTS (
    SELECT 1 FROM so_lines AS sl
    WHERE sl.so_id = so.id AND sl.sku_id = s.id
  );

INSERT INTO so_lines (so_id, sku_id, requested_quantity, allocated_quantity, picked_quantity, shipped_quantity)
SELECT
  so.id AS so_id,
  s.id AS sku_id,
  50 AS requested_quantity,
  0 AS allocated_quantity,
  0 AS picked_quantity,
  0 AS shipped_quantity
FROM sales_orders AS so, skus AS s
WHERE
  so.order_number = 'SO-2001' AND s.sku_code = 'SKU-1002'
  AND NOT EXISTS (
    SELECT 1 FROM so_lines AS sl
    WHERE sl.so_id = so.id AND sl.sku_id = s.id
  );

-- SO-2002 lines (ALLOCATED)
INSERT INTO so_lines (so_id, sku_id, requested_quantity, allocated_quantity, picked_quantity, shipped_quantity)
SELECT
  so.id AS so_id,
  s.id AS sku_id,
  200 AS requested_quantity,
  200 AS allocated_quantity,
  0 AS picked_quantity,
  0 AS shipped_quantity
FROM sales_orders AS so, skus AS s
WHERE
  so.order_number = 'SO-2002' AND s.sku_code = 'SKU-1003'
  AND NOT EXISTS (
    SELECT 1 FROM so_lines AS sl
    WHERE sl.so_id = so.id AND sl.sku_id = s.id
  );

-- SO-2003 lines (PICKED)
INSERT INTO so_lines (so_id, sku_id, requested_quantity, allocated_quantity, picked_quantity, shipped_quantity)
SELECT
  so.id AS so_id,
  s.id AS sku_id,
  80 AS requested_quantity,
  80 AS allocated_quantity,
  80 AS picked_quantity,
  0 AS shipped_quantity
FROM sales_orders AS so, skus AS s
WHERE
  so.order_number = 'SO-2003' AND s.sku_code = 'SKU-1004'
  AND NOT EXISTS (
    SELECT 1 FROM so_lines AS sl
    WHERE sl.so_id = so.id AND sl.sku_id = s.id
  );

INSERT INTO so_lines (so_id, sku_id, requested_quantity, allocated_quantity, picked_quantity, shipped_quantity)
SELECT
  so.id AS so_id,
  s.id AS sku_id,
  40 AS requested_quantity,
  40 AS allocated_quantity,
  40 AS picked_quantity,
  0 AS shipped_quantity
FROM sales_orders AS so, skus AS s
WHERE
  so.order_number = 'SO-2003' AND s.sku_code = 'SKU-1005'
  AND NOT EXISTS (
    SELECT 1 FROM so_lines AS sl
    WHERE sl.so_id = so.id AND sl.sku_id = s.id
  );

-- SO-2004 lines (SHIPPED)
INSERT INTO so_lines (so_id, sku_id, requested_quantity, allocated_quantity, picked_quantity, shipped_quantity)
SELECT
  so.id AS so_id,
  s.id AS sku_id,
  60 AS requested_quantity,
  60 AS allocated_quantity,
  60 AS picked_quantity,
  60 AS shipped_quantity
FROM sales_orders AS so, skus AS s
WHERE
  so.order_number = 'SO-2004' AND s.sku_code = 'SKU-1002'
  AND NOT EXISTS (
    SELECT 1 FROM so_lines AS sl
    WHERE sl.so_id = so.id AND sl.sku_id = s.id
  );

-- Pick tasks for SO-2003 (PICKED) and a shipment for SO-2004 (SHIPPED)
INSERT INTO pick_tasks (so_id, so_line_id, sku_id, location_id, warehouse_id, expected_quantity, picked_quantity, assignee_id, status, started_at, completed_at)
SELECT
  so.id AS so_id,
  sl.id AS so_line_id,
  sl.sku_id,
  l.id AS location_id,
  w.id AS warehouse_id,
  sl.requested_quantity AS expected_quantity,
  sl.requested_quantity AS picked_quantity,
  u.id AS assignee_id,
  'COMPLETED' AS status,
  NOW() - INTERVAL '2 days' AS started_at,
  NOW() - INTERVAL '1 day' AS completed_at
FROM sales_orders AS so
INNER JOIN so_lines AS sl ON so.id = sl.so_id
INNER JOIN warehouses AS w ON so.warehouse_id = w.id
INNER JOIN locations AS l ON w.id = l.warehouse_id AND l.code = 'A-01'
INNER JOIN users AS u ON u.email = 'operator@wms.local'
WHERE
  so.order_number = 'SO-2003'
  AND NOT EXISTS (
    SELECT 1 FROM pick_tasks AS pt
    WHERE pt.so_id = so.id AND pt.so_line_id = sl.id
  );

INSERT INTO shipments (shipment_number, so_id, warehouse_id, carrier, tracking_number, shipped_at)
SELECT
  'SHP-3001' AS shipment_number,
  so.id AS so_id,
  w.id AS warehouse_id,
  'UPS' AS carrier,
  '1Z999AA10123456784' AS tracking_number,
  NOW() - INTERVAL '12 hours' AS shipped_at
FROM sales_orders AS so, warehouses AS w
WHERE so.order_number = 'SO-2004' AND w.code = 'WH-MAIN'
ON CONFLICT (shipment_number) DO NOTHING;

INSERT INTO shipment_items (shipment_id, so_line_id, quantity)
SELECT
  sh.id AS shipment_id,
  sl.id AS so_line_id,
  sl.shipped_quantity AS quantity
FROM shipments AS sh
INNER JOIN sales_orders AS so ON sh.so_id = so.id
INNER JOIN so_lines AS sl ON so.id = sl.so_id
WHERE
  so.order_number = 'SO-2004'
  AND NOT EXISTS (
    SELECT 1 FROM shipment_items AS si
    WHERE si.shipment_id = sh.id AND si.so_line_id = sl.id
  );

-- Reservations for SO-2002 (ALLOCATED)
INSERT INTO stock_reservations (sku_id, location_id, warehouse_id, sales_order_id, quantity, status)
SELECT
  sl.sku_id,
  l.id AS location_id,
  w.id AS warehouse_id,
  so.id AS sales_order_id,
  sl.allocated_quantity AS quantity,
  'ACTIVE' AS status
FROM sales_orders AS so
INNER JOIN so_lines AS sl ON so.id = sl.so_id
INNER JOIN warehouses AS w ON so.warehouse_id = w.id
INNER JOIN locations AS l ON w.id = l.warehouse_id AND l.code = 'B-02'
WHERE
  so.order_number = 'SO-2002'
  AND NOT EXISTS (
    SELECT 1 FROM stock_reservations AS sr
    WHERE sr.sales_order_id = so.id AND sr.sku_id = sl.sku_id
  );
