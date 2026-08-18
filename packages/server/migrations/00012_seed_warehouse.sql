-- Seed demo warehouse and locations

INSERT INTO warehouses (code, name, address)
VALUES ('WH-MAIN', 'Main Warehouse', '123 Logistics Drive, Springfield')
ON CONFLICT (code) DO UPDATE SET name = excluded.name, address = excluded.address;

INSERT INTO locations (warehouse_id, code, name, type, path, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'STAGING' AS code,
  'Staging Area' AS name,
  'BIN' AS type,
  '1.0' AS path,
  10000 AS capacity,
  'units' AS capacity_unit
FROM warehouses AS w
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO UPDATE SET name = excluded.name;

-- Rack A (Shelf + Bins)
INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'RACK-A' AS code,
  'Rack A' AS name,
  'SHELF' AS type,
  '1.1' AS path,
  NULL AS parent_id,
  NULL AS capacity,
  NULL AS capacity_unit
FROM warehouses AS w
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO NOTHING;

INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'A-01' AS code,
  'Rack A - Bin 01' AS name,
  'BIN' AS type,
  '1.1.1' AS path,
  r.id AS parent_id,
  1000 AS capacity,
  'units' AS capacity_unit
FROM warehouses AS w
INNER JOIN locations AS r ON w.id = r.warehouse_id AND r.code = 'RACK-A'
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO UPDATE SET capacity = excluded.capacity;

INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'A-02' AS code,
  'Rack A - Bin 02' AS name,
  'BIN' AS type,
  '1.1.2' AS path,
  r.id AS parent_id,
  1000 AS capacity,
  'units' AS capacity_unit
FROM warehouses AS w
INNER JOIN locations AS r ON w.id = r.warehouse_id AND r.code = 'RACK-A'
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO UPDATE SET capacity = excluded.capacity;

INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'A-03' AS code,
  'Rack A - Bin 03' AS name,
  'BIN' AS type,
  '1.1.3' AS path,
  r.id AS parent_id,
  1000 AS capacity,
  'units' AS capacity_unit
FROM warehouses AS w
INNER JOIN locations AS r ON w.id = r.warehouse_id AND r.code = 'RACK-A'
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO UPDATE SET capacity = excluded.capacity;

-- Rack B (Shelf + Bins)
INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'RACK-B' AS code,
  'Rack B' AS name,
  'SHELF' AS type,
  '1.2' AS path,
  NULL AS parent_id,
  NULL AS capacity,
  NULL AS capacity_unit
FROM warehouses AS w
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO NOTHING;

INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'B-01' AS code,
  'Rack B - Bin 01' AS name,
  'BIN' AS type,
  '1.2.1' AS path,
  r.id AS parent_id,
  1000 AS capacity,
  'units' AS capacity_unit
FROM warehouses AS w
INNER JOIN locations AS r ON w.id = r.warehouse_id AND r.code = 'RACK-B'
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO UPDATE SET capacity = excluded.capacity;

INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'B-02' AS code,
  'Rack B - Bin 02' AS name,
  'BIN' AS type,
  '1.2.2' AS path,
  r.id AS parent_id,
  1000 AS capacity,
  'units' AS capacity_unit
FROM warehouses AS w
INNER JOIN locations AS r ON w.id = r.warehouse_id AND r.code = 'RACK-B'
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO UPDATE SET capacity = excluded.capacity;

INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'B-03' AS code,
  'Rack B - Bin 03' AS name,
  'BIN' AS type,
  '1.2.3' AS path,
  r.id AS parent_id,
  1000 AS capacity,
  'units' AS capacity_unit
FROM warehouses AS w
INNER JOIN locations AS r ON w.id = r.warehouse_id AND r.code = 'RACK-B'
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO UPDATE SET capacity = excluded.capacity;

-- Rack C (Shelf + Bins)
INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'RACK-C' AS code,
  'Rack C' AS name,
  'SHELF' AS type,
  '1.3' AS path,
  NULL AS parent_id,
  NULL AS capacity,
  NULL AS capacity_unit
FROM warehouses AS w
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO NOTHING;

INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'C-01' AS code,
  'Rack C - Bin 01' AS name,
  'BIN' AS type,
  '1.3.1' AS path,
  r.id AS parent_id,
  1000 AS capacity,
  'units' AS capacity_unit
FROM warehouses AS w
INNER JOIN locations AS r ON w.id = r.warehouse_id AND r.code = 'RACK-C'
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO UPDATE SET capacity = excluded.capacity;

INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'C-02' AS code,
  'Rack C - Bin 02' AS name,
  'BIN' AS type,
  '1.3.2' AS path,
  r.id AS parent_id,
  1000 AS capacity,
  'units' AS capacity_unit
FROM warehouses AS w
INNER JOIN locations AS r ON w.id = r.warehouse_id AND r.code = 'RACK-C'
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO UPDATE SET capacity = excluded.capacity;

INSERT INTO locations (warehouse_id, code, name, type, path, parent_id, capacity, capacity_unit)
SELECT
  w.id AS warehouse_id,
  'C-03' AS code,
  'Rack C - Bin 03' AS name,
  'BIN' AS type,
  '1.3.3' AS path,
  r.id AS parent_id,
  1000 AS capacity,
  'units' AS capacity_unit
FROM warehouses AS w
INNER JOIN locations AS r ON w.id = r.warehouse_id AND r.code = 'RACK-C'
WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO UPDATE SET capacity = excluded.capacity;
