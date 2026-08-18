-- Seed sample purchase orders and lines

INSERT INTO purchase_orders (po_number, warehouse_id, supplier_name, expected_date, status, notes, created_by)
SELECT
  'PO-1001' AS po_number,
  w.id AS warehouse_id,
  'Acme Supply Co.' AS supplier_name,
  CURRENT_DATE + 7 AS expected_date,
  'DRAFT' AS status,
  'Seeded demo PO' AS notes,
  u.id AS created_by
FROM warehouses AS w, users AS u
WHERE w.code = 'WH-MAIN' AND u.email = 'manager@wms.local'
ON CONFLICT (po_number) DO NOTHING;

INSERT INTO purchase_orders (po_number, warehouse_id, supplier_name, expected_date, status, notes, created_by)
SELECT
  'PO-1002' AS po_number,
  w.id AS warehouse_id,
  'Global Materials Inc.' AS supplier_name,
  CURRENT_DATE + 14 AS expected_date,
  'SUBMITTED' AS status,
  'Seeded demo PO' AS notes,
  u.id AS created_by
FROM warehouses AS w, users AS u
WHERE w.code = 'WH-MAIN' AND u.email = 'manager@wms.local'
ON CONFLICT (po_number) DO NOTHING;

INSERT INTO purchase_orders (po_number, warehouse_id, supplier_name, expected_date, status, notes, created_by)
SELECT
  'PO-1003' AS po_number,
  w.id AS warehouse_id,
  'Acme Supply Co.' AS supplier_name,
  CURRENT_DATE - 5 AS expected_date,
  'PARTIALLY_RECEIVED' AS status,
  'Seeded demo PO' AS notes,
  u.id AS created_by
FROM warehouses AS w, users AS u
WHERE w.code = 'WH-MAIN' AND u.email = 'operator@wms.local'
ON CONFLICT (po_number) DO NOTHING;

INSERT INTO purchase_orders (po_number, warehouse_id, supplier_name, expected_date, status, notes, created_by)
SELECT
  'PO-1004' AS po_number,
  w.id AS warehouse_id,
  'PackRight Ltd.' AS supplier_name,
  CURRENT_DATE - 20 AS expected_date,
  'RECEIVED' AS status,
  'Seeded demo PO' AS notes,
  u.id AS created_by
FROM warehouses AS w, users AS u
WHERE w.code = 'WH-MAIN' AND u.email = 'operator@wms.local'
ON CONFLICT (po_number) DO NOTHING;

-- PO-1001 lines (DRAFT)
INSERT INTO po_lines (po_id, sku_id, expected_quantity, received_quantity, unit_cost)
SELECT
  po.id AS po_id,
  s.id AS sku_id,
  500 AS expected_quantity,
  0 AS received_quantity,
  0.12 AS unit_cost
FROM purchase_orders AS po, skus AS s
WHERE
  po.po_number = 'PO-1001' AND s.sku_code = 'SKU-1001'
  AND NOT EXISTS (
    SELECT 1 FROM po_lines AS pl
    WHERE pl.po_id = po.id AND pl.sku_id = s.id
  );

INSERT INTO po_lines (po_id, sku_id, expected_quantity, received_quantity, unit_cost)
SELECT
  po.id AS po_id,
  s.id AS sku_id,
  300 AS expected_quantity,
  0 AS received_quantity,
  0.55 AS unit_cost
FROM purchase_orders AS po, skus AS s
WHERE
  po.po_number = 'PO-1001' AND s.sku_code = 'SKU-1002'
  AND NOT EXISTS (
    SELECT 1 FROM po_lines AS pl
    WHERE pl.po_id = po.id AND pl.sku_id = s.id
  );

-- PO-1002 lines (SUBMITTED)
INSERT INTO po_lines (po_id, sku_id, expected_quantity, received_quantity, unit_cost)
SELECT
  po.id AS po_id,
  s.id AS sku_id,
  600 AS expected_quantity,
  0 AS received_quantity,
  0.25 AS unit_cost
FROM purchase_orders AS po, skus AS s
WHERE
  po.po_number = 'PO-1002' AND s.sku_code = 'SKU-1003'
  AND NOT EXISTS (
    SELECT 1 FROM po_lines AS pl
    WHERE pl.po_id = po.id AND pl.sku_id = s.id
  );

INSERT INTO po_lines (po_id, sku_id, expected_quantity, received_quantity, unit_cost)
SELECT
  po.id AS po_id,
  s.id AS sku_id,
  200 AS expected_quantity,
  0 AS received_quantity,
  0.80 AS unit_cost
FROM purchase_orders AS po, skus AS s
WHERE
  po.po_number = 'PO-1002' AND s.sku_code = 'SKU-1004'
  AND NOT EXISTS (
    SELECT 1 FROM po_lines AS pl
    WHERE pl.po_id = po.id AND pl.sku_id = s.id
  );

-- PO-1003 lines (PARTIALLY_RECEIVED)
INSERT INTO po_lines (po_id, sku_id, expected_quantity, received_quantity, unit_cost)
SELECT
  po.id AS po_id,
  s.id AS sku_id,
  400 AS expected_quantity,
  150 AS received_quantity,
  0.09 AS unit_cost
FROM purchase_orders AS po, skus AS s
WHERE
  po.po_number = 'PO-1003' AND s.sku_code = 'SKU-1001'
  AND NOT EXISTS (
    SELECT 1 FROM po_lines AS pl
    WHERE pl.po_id = po.id AND pl.sku_id = s.id
  );

INSERT INTO po_lines (po_id, sku_id, expected_quantity, received_quantity, unit_cost)
SELECT
  po.id AS po_id,
  s.id AS sku_id,
  250 AS expected_quantity,
  100 AS received_quantity,
  1.10 AS unit_cost
FROM purchase_orders AS po, skus AS s
WHERE
  po.po_number = 'PO-1003' AND s.sku_code = 'SKU-1006'
  AND NOT EXISTS (
    SELECT 1 FROM po_lines AS pl
    WHERE pl.po_id = po.id AND pl.sku_id = s.id
  );

-- PO-1004 lines (RECEIVED)
INSERT INTO po_lines (po_id, sku_id, expected_quantity, received_quantity, unit_cost)
SELECT
  po.id AS po_id,
  s.id AS sku_id,
  300 AS expected_quantity,
  300 AS received_quantity,
  0.15 AS unit_cost
FROM purchase_orders AS po, skus AS s
WHERE
  po.po_number = 'PO-1004' AND s.sku_code = 'SKU-1005'
  AND NOT EXISTS (
    SELECT 1 FROM po_lines AS pl
    WHERE pl.po_id = po.id AND pl.sku_id = s.id
  );

INSERT INTO po_lines (po_id, sku_id, expected_quantity, received_quantity, unit_cost)
SELECT
  po.id AS po_id,
  s.id AS sku_id,
  180 AS expected_quantity,
  180 AS received_quantity,
  0.65 AS unit_cost
FROM purchase_orders AS po, skus AS s
WHERE
  po.po_number = 'PO-1004' AND s.sku_code = 'SKU-1002'
  AND NOT EXISTS (
    SELECT 1 FROM po_lines AS pl
    WHERE pl.po_id = po.id AND pl.sku_id = s.id
  );
