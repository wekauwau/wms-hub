import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { AddPoLineInput, CreatePoInput, UpdatePoInput } from './po.schema.js'

export async function listPo() {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    po_number: string
    warehouse_id: number
    supplier_name: string | null
    expected_date: Date | null
    status: string
    notes: string | null
    created_by: number
    created_at: Date
    updated_at: Date
  }>`
    SELECT id, po_number, warehouse_id, supplier_name, expected_date, status, notes, created_by, created_at, updated_at
    FROM purchase_orders
    ORDER BY id
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    poNumber: r.po_number,
    warehouseId: String(r.warehouse_id),
    supplierName: r.supplier_name,
    expectedDate: r.expected_date,
    status: r.status,
    notes: r.notes,
    createdBy: String(r.created_by),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export async function getPo(id: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    po_number: string
    warehouse_id: number
    supplier_name: string | null
    expected_date: Date | null
    status: string
    notes: string | null
    created_by: number
    created_at: Date
    updated_at: Date
  }>`
    SELECT id, po_number, warehouse_id, supplier_name, expected_date, status, notes, created_by, created_at, updated_at
    FROM purchase_orders
    WHERE id = ${Number(id)}
  `.execute(db)

  const po = rows[0]
  if (!po) return null

  const lines = await getPoLines(id)

  return {
    id: String(po.id),
    poNumber: po.po_number,
    warehouseId: String(po.warehouse_id),
    supplierName: po.supplier_name,
    expectedDate: po.expected_date,
    status: po.status,
    notes: po.notes,
    createdBy: String(po.created_by),
    createdAt: po.created_at,
    updatedAt: po.updated_at,
    lines,
  }
}

export async function getPoLines(poId: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    po_id: number
    sku_id: number
    expected_quantity: number
    received_quantity: number
    unit_cost: number | null
    created_at: Date
  }>`
    SELECT id, po_id, sku_id, expected_quantity, received_quantity, unit_cost, created_at
    FROM po_lines
    WHERE po_id = ${Number(poId)}
    ORDER BY id
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    poId: String(r.po_id),
    skuId: String(r.sku_id),
    expectedQuantity: r.expected_quantity,
    receivedQuantity: r.received_quantity,
    unitCost: r.unit_cost,
    createdAt: r.created_at,
  }))
}

export async function createPo(input: CreatePoInput, createdBy: string) {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    po_number: string
    warehouse_id: number
    supplier_name: string | null
    expected_date: Date | null
    status: string
    notes: string | null
    created_by: number
    created_at: Date
    updated_at: Date
  }>`
    INSERT INTO purchase_orders (po_number, warehouse_id, supplier_name, expected_date, notes, created_by)
    VALUES (${input.poNumber}, ${input.warehouseId}, ${input.supplierName ?? null}, ${input.expectedDate ?? null}, ${input.notes ?? null}, ${Number(createdBy)})
    RETURNING id, po_number, warehouse_id, supplier_name, expected_date, status, notes, created_by, created_at, updated_at
  `.execute(db)

  const po = rows[0]
  return {
    id: String(po.id),
    poNumber: po.po_number,
    warehouseId: String(po.warehouse_id),
    supplierName: po.supplier_name,
    expectedDate: po.expected_date,
    status: po.status,
    notes: po.notes,
    createdBy: String(po.created_by),
    createdAt: po.created_at,
    updatedAt: po.updated_at,
  }
}

export async function updatePo(id: string, input: UpdatePoInput) {
  const db = getDb()

  const fields: string[] = []
  if (input.poNumber !== undefined)
    fields.push(`po_number = '${input.poNumber.replace(/'/g, "''")}'`)
  if (input.warehouseId !== undefined) fields.push(`warehouse_id = ${input.warehouseId}`)
  if (input.supplierName !== undefined)
    fields.push(`supplier_name = '${input.supplierName?.replace(/'/g, "''") ?? ''}'`)
  if (input.expectedDate !== undefined)
    fields.push(`expected_date = ${input.expectedDate ? `'${input.expectedDate}'` : 'NULL'}`)
  if (input.status !== undefined) fields.push(`status = '${input.status}'`)
  if (input.notes !== undefined) fields.push(`notes = '${input.notes?.replace(/'/g, "''") ?? ''}'`)

  if (fields.length === 0) return getPo(id)

  fields.push(`updated_at = NOW()`)

  const { rows } = await sql<{
    id: number
    po_number: string
    warehouse_id: number
    supplier_name: string | null
    expected_date: Date | null
    status: string
    notes: string | null
    created_by: number
    created_at: Date
    updated_at: Date
  }>`
    UPDATE purchase_orders
    SET ${sql.join(
      fields.map((f) => sql.raw(f)),
      sql`, `,
    )}
    WHERE id = ${Number(id)}
    RETURNING id, po_number, warehouse_id, supplier_name, expected_date, status, notes, created_by, created_at, updated_at
  `.execute(db)

  const po = rows[0]
  if (!po) return null

  return {
    id: String(po.id),
    poNumber: po.po_number,
    warehouseId: String(po.warehouse_id),
    supplierName: po.supplier_name,
    expectedDate: po.expected_date,
    status: po.status,
    notes: po.notes,
    createdBy: String(po.created_by),
    createdAt: po.created_at,
    updatedAt: po.updated_at,
  }
}

export async function deletePo(id: string) {
  const db = getDb()
  const { rows } = await sql<{ id: number }>`
    DELETE FROM purchase_orders
    WHERE id = ${Number(id)}
    RETURNING id
  `.execute(db)

  return rows.length > 0
}

export async function addPoLine(poId: string, input: AddPoLineInput) {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    po_id: number
    sku_id: number
    expected_quantity: number
    received_quantity: number
    unit_cost: number | null
    created_at: Date
  }>`
    INSERT INTO po_lines (po_id, sku_id, expected_quantity, unit_cost)
    VALUES (${Number(poId)}, ${input.skuId}, ${input.expectedQuantity}, ${input.unitCost ?? null})
    RETURNING id, po_id, sku_id, expected_quantity, received_quantity, unit_cost, created_at
  `.execute(db)

  const line = rows[0]
  return {
    id: String(line.id),
    poId: String(line.po_id),
    skuId: String(line.sku_id),
    expectedQuantity: line.expected_quantity,
    receivedQuantity: line.received_quantity,
    unitCost: line.unit_cost,
    createdAt: line.created_at,
  }
}

export async function deletePoLine(poId: string, lineId: string) {
  const db = getDb()
  const { rows } = await sql<{ id: number }>`
    DELETE FROM po_lines
    WHERE id = ${Number(lineId)} AND po_id = ${Number(poId)}
    RETURNING id
  `.execute(db)

  return rows.length > 0
}
