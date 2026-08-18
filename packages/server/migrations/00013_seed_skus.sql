-- Seed demo SKUs and initial inventory

INSERT INTO skus (sku_code, name, description, category, uom, weight, volume)
VALUES
('SKU-1001', 'Aluminum Can - 330ml', 'Standard 330ml aluminum beverage can', 'Packaging', 'UNITS', 0.013, 0.00035),
('SKU-1002', 'Cardboard Box - Medium', 'Medium corrugated cardboard shipping box', 'Packaging', 'UNITS', 0.4, 0.008),
('SKU-1003', 'Plastic Bottle - 500ml', '500ml PET plastic water bottle', 'Beverage', 'UNITS', 0.02, 0.0005),
('SKU-1004', 'Glass Jar - 250ml', '250ml glass food jar with lid', 'Packaging', 'UNITS', 0.18, 0.0004),
('SKU-1005', 'Paper Label - Roll', 'Roll of adhesive paper labels', 'Supplies', 'ROLLS', 1.2, 0.002),
('SKU-1006', 'Folding Carton - Large', 'Large folding carton for appliances', 'Packaging', 'UNITS', 0.9, 0.03)
ON CONFLICT (sku_code) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  category = excluded.category;

-- Initial stock into bin locations via inventory movements (trigger updates current_stock)
INSERT INTO inventory_movements (sku_id, location_id, warehouse_id, quantity, movement_type, reference_type, reason_code, notes, created_by)
SELECT
  s.id AS sku_id,
  l.id AS location_id,
  w.id AS warehouse_id,
  v.qty AS quantity,
  'RECEIPT' AS movement_type,
  'SEED' AS reference_type,
  'INITIAL_STOCK' AS reason_code,
  'Seeded initial stock' AS notes,
  u.id AS created_by
FROM (
  VALUES
  ('SKU-1001', 'A-01', 500),
  ('SKU-1001', 'A-02', 300),
  ('SKU-1002', 'A-01', 400),
  ('SKU-1002', 'B-01', 200),
  ('SKU-1003', 'B-02', 800),
  ('SKU-1004', 'C-01', 350),
  ('SKU-1005', 'C-02', 120),
  ('SKU-1006', 'C-03', 75)
) AS v (sku_code, loc_code, qty)
INNER JOIN skus AS s ON v.sku_code = s.sku_code
INNER JOIN locations AS l
  ON l.warehouse_id = (
    SELECT id FROM warehouses
    WHERE code = 'WH-MAIN'
  ) AND v.loc_code = l.code
INNER JOIN warehouses AS w ON w.code = 'WH-MAIN'
INNER JOIN users AS u ON u.email = 'admin@wms.local'
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_movements AS im
  WHERE
    im.reference_type = 'SEED'
    AND im.sku_id = s.id
    AND im.location_id = l.id
);
