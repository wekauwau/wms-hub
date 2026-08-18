import dotenv from 'dotenv'
import fs from 'fs'
import { sql } from 'kysely'
import path from 'path'
import { getDb } from '../config/db.js'
import { getEnv } from '../config/env.js'
import { hashPassword } from '../lib/password.js'

function findEnvFile(): string {
  let dir = process.cwd()
  while (dir !== path.dirname(dir)) {
    const envPath = path.join(dir, '.env')
    if (fs.existsSync(envPath)) return envPath
    dir = path.dirname(dir)
  }
  return path.join(process.cwd(), '.env')
}

async function seed() {
  dotenv.config({ path: findEnvFile() })
  getEnv()

  const db = getDb()
  console.log('Seeding demo data...')

  // Warehouse
  const wh = await sql<{ id: number }>`
    INSERT INTO warehouses (code, name, address)
    VALUES ('WH-SEED', 'Seeded Warehouse', '1 Seed Street, Demo City')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `.execute(db)
  const warehouseId = wh.rows[0].id
  console.log(`  warehouse: WH-SEED (id=${warehouseId})`)

  // Locations
  await sql`
    INSERT INTO locations (warehouse_id, code, name, type, path, capacity, capacity_unit)
    VALUES (${warehouseId}, 'STAGING', 'Staging Area', 'BIN', '1.0', 10000, 'units')
    ON CONFLICT (warehouse_id, code) DO NOTHING
  `.execute(db)

  for (let i = 1; i <= 3; i++) {
    const binCode = `SEED-0${i}`
    await sql`
      INSERT INTO locations (warehouse_id, code, name, type, path, capacity, capacity_unit)
      VALUES (${warehouseId}, ${binCode}, ${`Seed Bin ${i}`}, 'BIN', ${`1.${i}`}, 1000, 'units')
      ON CONFLICT (warehouse_id, code) DO NOTHING
    `.execute(db)
  }
  console.log('  locations: STAGING, SEED-01..SEED-03')

  // Users
  const demoUsers = [
    {
      email: 'seed.manager@wms.local',
      password: 'manager123',
      firstName: 'Seed',
      lastName: 'Manager',
      role: 'manager',
    },
    {
      email: 'seed.operator@wms.local',
      password: 'operator123',
      firstName: 'Seed',
      lastName: 'Operator',
      role: 'operator',
    },
  ]

  for (const u of demoUsers) {
    const passwordHash = await hashPassword(u.password)
    const user = await sql<{ id: number }>`
      INSERT INTO users (email, password_hash, first_name, last_name, status)
      VALUES (${u.email}, ${passwordHash}, ${u.firstName}, ${u.lastName}, 'ACTIVE')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id
    `.execute(db)

    await sql`
      INSERT INTO user_roles (user_id, role_id, warehouse_id)
      SELECT ${user.rows[0].id}, r.id, 0
      FROM roles r
      WHERE r.name = ${u.role}
      ON CONFLICT DO NOTHING
    `.execute(db)
  }
  console.log('  users: seed.manager@wms.local, seed.operator@wms.local')

  // SKUs
  const skus = [
    { skuCode: 'SEED-SKU-1', name: 'Seed Widget A', category: 'Widgets', uom: 'UNITS' },
    { skuCode: 'SEED-SKU-2', name: 'Seed Widget B', category: 'Widgets', uom: 'UNITS' },
    { skuCode: 'SEED-SKU-3', name: 'Seed Gadget', category: 'Gadgets', uom: 'UNITS' },
  ]

  for (const s of skus) {
    await sql`
      INSERT INTO skus (sku_code, name, description, category, uom)
      VALUES (${s.skuCode}, ${s.name}, NULL, ${s.category}, ${s.uom})
      ON CONFLICT (sku_code) DO NOTHING
    `.execute(db)
  }
  console.log('  skus: SEED-SKU-1..3')

  // Initial inventory
  const admin = await sql<{ id: number }>`
    SELECT id FROM users WHERE email = 'admin@wms.local'
  `.execute(db)

  if (admin.rows[0]) {
    const loc = await sql<{ id: number }>`
      SELECT id FROM locations
      WHERE warehouse_id = ${warehouseId} AND code = 'SEED-01'
    `.execute(db)

    const sku = await sql<{ id: number }>`
      SELECT id FROM skus WHERE sku_code = 'SEED-SKU-1'
    `.execute(db)

    if (loc.rows[0] && sku.rows[0]) {
      await sql`
        INSERT INTO inventory_movements (sku_id, location_id, warehouse_id, quantity, movement_type, reference_type, reason_code, notes, created_by)
        VALUES (${sku.rows[0].id}, ${loc.rows[0].id}, ${warehouseId}, 500, 'RECEIPT', 'SEED', 'INITIAL_STOCK', 'Seeded initial stock', ${admin.rows[0].id})
        ON CONFLICT DO NOTHING
      `.execute(db)
      console.log('  inventory: 500 units SEED-SKU-1 at SEED-01')
    }
  }

  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
