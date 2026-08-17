import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { AddSoLineInput, CreateSoInput, UpdateSoInput } from './so.schema.js'

export async function listSo() {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    order_number: string
    warehouse_id: number
    customer_name: string | null
    customer_address: string | null
    status: string
    priority: number
    notes: string | null
    created_by: number
    created_at: Date
    updated_at: Date
  }>`
    SELECT id, order_number, warehouse_id, customer_name, customer_address, status, priority, notes, created_by, created_at, updated_at
    FROM sales_orders
    ORDER BY id
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    orderNumber: r.order_number,
    warehouseId: String(r.warehouse_id),
    customerName: r.customer_name,
    customerAddress: r.customer_address,
    status: r.status,
    priority: r.priority,
    notes: r.notes,
    createdBy: String(r.created_by),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export async function getSo(id: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    order_number: string
    warehouse_id: number
    customer_name: string | null
    customer_address: string | null
    status: string
    priority: number
    notes: string | null
    created_by: number
    created_at: Date
    updated_at: Date
  }>`
    SELECT id, order_number, warehouse_id, customer_name, customer_address, status, priority, notes, created_by, created_at, updated_at
    FROM sales_orders
    WHERE id = ${Number(id)}
  `.execute(db)

  const so = rows[0]
  if (!so) return null

  const lines = await getSoLines(id)

  return {
    id: String(so.id),
    orderNumber: so.order_number,
    warehouseId: String(so.warehouse_id),
    customerName: so.customer_name,
    customerAddress: so.customer_address,
    status: so.status,
    priority: so.priority,
    notes: so.notes,
    createdBy: String(so.created_by),
    createdAt: so.created_at,
    updatedAt: so.updated_at,
    lines,
  }
}

export async function getSoLines(soId: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    so_id: number
    sku_id: number
    requested_quantity: number
    allocated_quantity: number
    picked_quantity: number
    packed_quantity: number
    shipped_quantity: number
    created_at: Date
  }>`
    SELECT id, so_id, sku_id, requested_quantity, allocated_quantity, picked_quantity, packed_quantity, shipped_quantity, created_at
    FROM so_lines
    WHERE so_id = ${Number(soId)}
    ORDER BY id
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    soId: String(r.so_id),
    skuId: String(r.sku_id),
    requestedQuantity: r.requested_quantity,
    allocatedQuantity: r.allocated_quantity,
    pickedQuantity: r.picked_quantity,
    packedQuantity: r.packed_quantity,
    shippedQuantity: r.shipped_quantity,
    createdAt: r.created_at,
  }))
}

export async function createSo(input: CreateSoInput, createdBy: string) {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    order_number: string
    warehouse_id: number
    customer_name: string | null
    customer_address: string | null
    status: string
    priority: number
    notes: string | null
    created_by: number
    created_at: Date
    updated_at: Date
  }>`
    INSERT INTO sales_orders (order_number, warehouse_id, customer_name, customer_address, priority, notes, created_by)
    VALUES (${input.orderNumber}, ${input.warehouseId}, ${input.customerName ?? null}, ${input.customerAddress ?? null}, ${input.priority ?? 0}, ${input.notes ?? null}, ${Number(createdBy)})
    RETURNING id, order_number, warehouse_id, customer_name, customer_address, status, priority, notes, created_by, created_at, updated_at
  `.execute(db)

  const so = rows[0]
  return {
    id: String(so.id),
    orderNumber: so.order_number,
    warehouseId: String(so.warehouse_id),
    customerName: so.customer_name,
    customerAddress: so.customer_address,
    status: so.status,
    priority: so.priority,
    notes: so.notes,
    createdBy: String(so.created_by),
    createdAt: so.created_at,
    updatedAt: so.updated_at,
  }
}

export async function updateSo(id: string, input: UpdateSoInput) {
  const db = getDb()

  const fields: string[] = []
  if (input.orderNumber !== undefined)
    fields.push(`order_number = '${input.orderNumber.replace(/'/g, "''")}'`)
  if (input.warehouseId !== undefined) fields.push(`warehouse_id = ${input.warehouseId}`)
  if (input.customerName !== undefined)
    fields.push(`customer_name = '${input.customerName?.replace(/'/g, "''") ?? ''}'`)
  if (input.customerAddress !== undefined)
    fields.push(`customer_address = '${input.customerAddress?.replace(/'/g, "''") ?? ''}'`)
  if (input.status !== undefined) fields.push(`status = '${input.status}'`)
  if (input.priority !== undefined) fields.push(`priority = ${input.priority}`)
  if (input.notes !== undefined) fields.push(`notes = '${input.notes?.replace(/'/g, "''") ?? ''}'`)

  if (fields.length === 0) return getSo(id)

  fields.push(`updated_at = NOW()`)

  const { rows } = await sql<{
    id: number
    order_number: string
    warehouse_id: number
    customer_name: string | null
    customer_address: string | null
    status: string
    priority: number
    notes: string | null
    created_by: number
    created_at: Date
    updated_at: Date
  }>`
    UPDATE sales_orders
    SET ${sql.join(
      fields.map((f) => sql.raw(f)),
      sql`, `,
    )}
    WHERE id = ${Number(id)}
    RETURNING id, order_number, warehouse_id, customer_name, customer_address, status, priority, notes, created_by, created_at, updated_at
  `.execute(db)

  const so = rows[0]
  if (!so) return null

  return {
    id: String(so.id),
    orderNumber: so.order_number,
    warehouseId: String(so.warehouse_id),
    customerName: so.customer_name,
    customerAddress: so.customer_address,
    status: so.status,
    priority: so.priority,
    notes: so.notes,
    createdBy: String(so.created_by),
    createdAt: so.created_at,
    updatedAt: so.updated_at,
  }
}

export async function deleteSo(id: string) {
  const db = getDb()
  const { rows } = await sql<{ id: number }>`
    DELETE FROM sales_orders
    WHERE id = ${Number(id)}
    RETURNING id
  `.execute(db)

  return rows.length > 0
}

export async function addSoLine(soId: string, input: AddSoLineInput) {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    so_id: number
    sku_id: number
    requested_quantity: number
    allocated_quantity: number
    picked_quantity: number
    packed_quantity: number
    shipped_quantity: number
    created_at: Date
  }>`
    INSERT INTO so_lines (so_id, sku_id, requested_quantity)
    VALUES (${Number(soId)}, ${input.skuId}, ${input.requestedQuantity})
    RETURNING id, so_id, sku_id, requested_quantity, allocated_quantity, picked_quantity, packed_quantity, shipped_quantity, created_at
  `.execute(db)

  const line = rows[0]
  return {
    id: String(line.id),
    soId: String(line.so_id),
    skuId: String(line.sku_id),
    requestedQuantity: line.requested_quantity,
    allocatedQuantity: line.allocated_quantity,
    pickedQuantity: line.picked_quantity,
    packedQuantity: line.packed_quantity,
    shippedQuantity: line.shipped_quantity,
    createdAt: line.created_at,
  }
}

export async function deleteSoLine(soId: string, lineId: string) {
  const db = getDb()
  const { rows } = await sql<{ id: number }>`
    DELETE FROM so_lines
    WHERE id = ${Number(lineId)} AND so_id = ${Number(soId)}
    RETURNING id
  `.execute(db)

  return rows.length > 0
}
