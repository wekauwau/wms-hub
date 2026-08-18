-- Seed sample workflow records: cycle counts, stock adjustments, stock transfers, exceptions

INSERT INTO cycle_counts (count_number, warehouse_id, location_id, status, initiated_by, reconciled_by, created_at, reconciled_at)
SELECT
  'CC-4001' AS count_number,
  w.id AS warehouse_id,
  l.id AS location_id,
  'RECONCILED' AS status,
  u1.id AS initiated_by,
  u2.id AS reconciled_by,
  NOW() - INTERVAL '10 days' AS created_at,
  NOW() - INTERVAL '9 days' AS reconciled_at
FROM warehouses AS w, locations AS l, users AS u1, users AS u2
WHERE w.code = 'WH-MAIN' AND l.code = 'A-01' AND u1.email = 'manager@wms.local' AND u2.email = 'operator@wms.local'
ON CONFLICT (count_number) DO NOTHING;

INSERT INTO cycle_count_lines (cycle_count_id, sku_id, location_id, expected_quantity, counted_quantity, counted_by, counted_at)
SELECT
  cc.id AS cycle_count_id,
  s.id AS sku_id,
  l.id AS location_id,
  500 AS expected_quantity,
  492 AS counted_quantity,
  u.id AS counted_by,
  NOW() - INTERVAL '9 days' AS counted_at
FROM cycle_counts AS cc, skus AS s, locations AS l, users AS u
WHERE
  cc.count_number = 'CC-4001' AND s.sku_code = 'SKU-1001' AND l.code = 'A-01' AND u.email = 'operator@wms.local'
  AND NOT EXISTS (
    SELECT 1 FROM cycle_count_lines AS cl
    WHERE cl.cycle_count_id = cc.id AND cl.sku_id = s.id
  );

INSERT INTO stock_adjustments (adjustment_number, warehouse_id, sku_id, location_id, quantity_change, reason_code, notes, status, requested_by, approved_by, created_at, approved_at)
SELECT
  'ADJ-5001' AS adjustment_number,
  w.id AS warehouse_id,
  s.id AS sku_id,
  l.id AS location_id,
  -8 AS quantity_change,
  'DAMAGED_GOODS' AS reason_code,
  'Found damaged cans' AS notes,
  'APPROVED' AS status,
  u1.id AS requested_by,
  u2.id AS approved_by,
  NOW() - INTERVAL '6 days' AS created_at,
  NOW() - INTERVAL '5 days' AS approved_at
FROM warehouses AS w, skus AS s, locations AS l, users AS u1, users AS u2
WHERE w.code = 'WH-MAIN' AND s.sku_code = 'SKU-1001' AND l.code = 'A-01' AND u1.email = 'operator@wms.local' AND u2.email = 'manager@wms.local'
ON CONFLICT (adjustment_number) DO NOTHING;

INSERT INTO stock_transfers (transfer_number, sku_id, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, quantity, status, requested_by, completed_by, created_at, completed_at)
SELECT
  'TRF-6001' AS transfer_number,
  s.id AS sku_id,
  w.id AS from_warehouse_id,
  l1.id AS from_location_id,
  w.id AS to_warehouse_id,
  l2.id AS to_location_id,
  50 AS quantity,
  'COMPLETED' AS status,
  u1.id AS requested_by,
  u2.id AS completed_by,
  NOW() - INTERVAL '4 days' AS created_at,
  NOW() - INTERVAL '3 days' AS completed_at
FROM warehouses AS w, skus AS s, locations AS l1, locations AS l2, users AS u1, users AS u2
WHERE w.code = 'WH-MAIN' AND s.sku_code = 'SKU-1002' AND l1.code = 'A-01' AND l2.code = 'B-01' AND u1.email = 'operator@wms.local' AND u2.email = 'manager@wms.local'
ON CONFLICT (transfer_number) DO NOTHING;

INSERT INTO exceptions (exception_type, status, reference_type, reference_id, warehouse_id, sku_id, location_id, description, resolution, raised_by, resolved_by, created_at, resolved_at)
SELECT
  'STOCK_DISCREPANCY' AS exception_type,
  'RESOLVED' AS status,
  'CYCLE_COUNT' AS reference_type,
  cc.id AS reference_id,
  w.id AS warehouse_id,
  s.id AS sku_id,
  l.id AS location_id,
  'Counted 492 vs expected 500' AS description,
  'Adjusted stock' AS resolution,
  u1.id AS raised_by,
  u2.id AS resolved_by,
  NOW() - INTERVAL '9 days' AS created_at,
  NOW() - INTERVAL '8 days' AS resolved_at
FROM cycle_counts AS cc, warehouses AS w, skus AS s, locations AS l, users AS u1, users AS u2
WHERE cc.count_number = 'CC-4001' AND w.code = 'WH-MAIN' AND s.sku_code = 'SKU-1001' AND l.code = 'A-01' AND u1.email = 'operator@wms.local' AND u2.email = 'manager@wms.local'
ON CONFLICT DO NOTHING;

INSERT INTO exceptions (exception_type, status, reference_type, warehouse_id, sku_id, location_id, description, raised_by, created_at)
SELECT
  'QUALITY_HOLD' AS exception_type,
  'OPEN' AS status,
  'RECEIPT' AS reference_type,
  w.id AS warehouse_id,
  s.id AS sku_id,
  l.id AS location_id,
  'Damaged goods received' AS description,
  u.id AS raised_by,
  NOW() - INTERVAL '2 days' AS created_at
FROM warehouses AS w, skus AS s, locations AS l, users AS u
WHERE w.code = 'WH-MAIN' AND s.sku_code = 'SKU-1004' AND l.code = 'C-01' AND u.email = 'operator@wms.local'
ON CONFLICT DO NOTHING;
