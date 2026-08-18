-- Seed demo users (passwords: manager123, operator123, viewer123)

INSERT INTO users (email, password_hash, first_name, last_name, status)
VALUES
('manager@wms.local', '$argon2id$v=19$m=65536,t=3,p=4$3kQtfgfq1fqKXeW8v3ZqpA$SHXS6j8bMOEH7dNBvUzRZGL9vS0lObjfJAoFojwkv4M', 'Warehouse', 'Manager', 'ACTIVE'),
('operator@wms.local', '$argon2id$v=19$m=65536,t=3,p=4$PNWutMqDVkH4mCH3EqHIWQ$F5kHd4At6blAqZMff4pPF0aTZm3rjDJbGO5k6Y9Oo7U', 'Warehouse', 'Operator', 'ACTIVE'),
('viewer@wms.local', '$argon2id$v=19$m=65536,t=3,p=4$z5HfcxqbvhUswI9QKBJqqg$aTm726p6HGcN+gclN1iVOQ56Vl+9B+tZP9eVUCa7G6U', 'Read', 'Only', 'ACTIVE')
ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash;

-- Assign roles to demo users
INSERT INTO user_roles (user_id, role_id, warehouse_id)
SELECT
  u.id AS user_id,
  r.id AS role_id,
  0 AS warehouse_id
FROM users AS u
CROSS JOIN roles AS r
WHERE
  u.email = 'manager@wms.local' AND r.name = 'manager'
  OR u.email = 'operator@wms.local' AND r.name = 'operator'
  OR u.email = 'viewer@wms.local' AND r.name = 'viewer'
ON CONFLICT DO NOTHING;
