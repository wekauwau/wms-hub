-- Seed permissions
INSERT INTO permissions (name, description)
VALUES
('users:read', 'View users'),
('users:write', 'Create and edit users'),
('users:delete', 'Delete users'),
('roles:read', 'View roles'),
('roles:write', 'Create and edit roles'),
('roles:delete', 'Delete roles'),
('warehouses:read', 'View warehouses'),
('warehouses:write', 'Create and edit warehouses'),
('locations:read', 'View locations'),
('locations:write', 'Create and edit locations'),
('skus:read', 'View SKUs'),
('skus:write', 'Create and edit SKUs'),
('inventory:read', 'View inventory'),
('inventory:write', 'Adjust inventory'),
('inventory:transfer', 'Transfer inventory between locations'),
('inbound:read', 'View purchase orders'),
('inbound:write', 'Create and edit purchase orders'),
('inbound:receive', 'Receive inbound shipments'),
('outbound:read', 'View sales orders'),
('outbound:write', 'Create and edit sales orders'),
('outbound:pick', 'Pick items for orders'),
('outbound:ship', 'Ship orders'),
('cycle_count:read', 'View cycle counts'),
('cycle_count:write', 'Create and run cycle counts'),
('dashboard:read', 'View dashboard and reports');

-- Seed roles
INSERT INTO roles (name, description)
VALUES
('admin', 'Full system access'),
('manager', 'Warehouse manager with broad access'),
('operator', 'Day-to-day warehouse operations'),
('viewer', 'Read-only access');

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  r.id AS role_id,
  p.id AS permission_id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.name = 'admin';

-- Manager gets most permissions except user/role management
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  r.id AS role_id,
  p.id AS permission_id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE
  r.name = 'manager'
  AND p.name NOT LIKE 'users:%'
  AND p.name NOT LIKE 'roles:%';

-- Operator gets operational permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  r.id AS role_id,
  p.id AS permission_id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE
  r.name = 'operator'
  AND p.name IN (
    'users:read',
    'warehouses:read',
    'locations:read',
    'skus:read',
    'inventory:read',
    'inventory:write',
    'inbound:read',
    'inbound:write',
    'inbound:receive',
    'outbound:read',
    'outbound:write',
    'outbound:pick',
    'outbound:ship',
    'cycle_count:read',
    'cycle_count:write',
    'dashboard:read'
  );

-- Viewer gets read-only permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  r.id AS role_id,
  p.id AS permission_id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE
  r.name = 'viewer'
  AND p.name LIKE '%:read';

-- Seed admin user (password: admin123 - change in production!)
INSERT INTO users (email, password_hash, first_name, last_name, status)
VALUES (
  'admin@wms.local',
  '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
  'System',
  'Admin',
  'ACTIVE'
);

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
  AND r.name = 'admin';
