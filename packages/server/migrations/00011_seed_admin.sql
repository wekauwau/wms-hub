-- Seed admin user with proper argon2 hash (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, status)
VALUES (
  'admin@wms.local',
  '$argon2id$v=19$m=65536,t=3,p=4$B2g85WVpRDhMI4BKZxiYXg$dWy30ZZWGxR7a2E4oHdte72Iuu+AOnyFJN87e3o7FTE',
  'System',
  'Admin',
  'ACTIVE'
)
ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash;

-- Assign admin role to admin user
INSERT INTO user_roles (user_id, role_id, warehouse_id)
SELECT
  u.id AS user_id,
  r.id AS role_id,
  0 AS warehouse_id
FROM users AS u
CROSS JOIN roles AS r
WHERE
  u.email = 'admin@wms.local'
  AND r.name = 'admin'
ON CONFLICT DO NOTHING;
