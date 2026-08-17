import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { AppError } from '../../middleware/errors.js'
import { CreateStockAdjustmentInput } from './stock-adjustment.schema.js'

export async function listStockAdjustments(warehouseId?: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    adjustment_number: string
    warehouse_id: number
    sku_id: number
    location_id: number
    quantity_change: number
    reason_code: string
    notes: string | null
    status: string
    requested_by: number
    approved_by: number | null
    created_at: Date
    approved_at: Date | null
  }>`
    SELECT id, adjustment_number, warehouse_id, sku_id, location_id, quantity_change,
           reason_code, notes, status, requested_by, approved_by, created_at, approved_at
    FROM stock_adjustments
    ${warehouseId ? sql`WHERE warehouse_id = ${Number(warehouseId)}` : sql``}
    ORDER BY id DESC
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    adjustmentNumber: r.adjustment_number,
    warehouseId: String(r.warehouse_id),
    skuId: String(r.sku_id),
    locationId: String(r.location_id),
    quantityChange: r.quantity_change,
    reasonCode: r.reason_code,
    notes: r.notes,
    status: r.status,
    requestedBy: String(r.requested_by),
    approvedBy: r.approved_by ? String(r.approved_by) : null,
    createdAt: r.created_at,
    approvedAt: r.approved_at,
  }))
}

export async function getStockAdjustment(id: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    adjustment_number: string
    warehouse_id: number
    sku_id: number
    location_id: number
    quantity_change: number
    reason_code: string
    notes: string | null
    status: string
    requested_by: number
    approved_by: number | null
    created_at: Date
    approved_at: Date | null
  }>`
    SELECT id, adjustment_number, warehouse_id, sku_id, location_id, quantity_change,
           reason_code, notes, status, requested_by, approved_by, created_at, approved_at
    FROM stock_adjustments
    WHERE id = ${Number(id)}
  `.execute(db)

  const adj = rows[0]
  if (!adj) return null

  return {
    id: String(adj.id),
    adjustmentNumber: adj.adjustment_number,
    warehouseId: String(adj.warehouse_id),
    skuId: String(adj.sku_id),
    locationId: String(adj.location_id),
    quantityChange: adj.quantity_change,
    reasonCode: adj.reason_code,
    notes: adj.notes,
    status: adj.status,
    requestedBy: String(adj.requested_by),
    approvedBy: adj.approved_by ? String(adj.approved_by) : null,
    createdAt: adj.created_at,
    approvedAt: adj.approved_at,
  }
}

export async function createStockAdjustment(
  input: CreateStockAdjustmentInput,
  requestedBy: string,
) {
  const db = getDb()

  const adjustmentNumber = `ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const { rows } = await sql<{
    id: number
    adjustment_number: string
    warehouse_id: number
    sku_id: number
    location_id: number
    quantity_change: number
    reason_code: string
    notes: string | null
    status: string
    requested_by: number
    created_at: Date
  }>`
    INSERT INTO stock_adjustments (adjustment_number, warehouse_id, sku_id, location_id, quantity_change, reason_code, notes, status, requested_by)
    VALUES (${adjustmentNumber}, ${input.warehouseId}, ${input.skuId}, ${input.locationId}, ${input.quantityChange}::decimal, ${input.reasonCode}, ${input.notes ?? null}, 'PENDING', ${Number(requestedBy)})
    RETURNING id, adjustment_number, warehouse_id, sku_id, location_id, quantity_change, reason_code, notes, status, requested_by, created_at
  `.execute(db)

  const adj = rows[0]
  return {
    id: String(adj.id),
    adjustmentNumber: adj.adjustment_number,
    warehouseId: String(adj.warehouse_id),
    skuId: String(adj.sku_id),
    locationId: String(adj.location_id),
    quantityChange: adj.quantity_change,
    reasonCode: adj.reason_code,
    notes: adj.notes,
    status: adj.status,
    requestedBy: String(adj.requested_by),
    approvedBy: null,
    createdAt: adj.created_at,
    approvedAt: null,
  }
}

export async function approveStockAdjustment(id: string, approvedBy: string, notes?: string) {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    warehouse_id: number
    sku_id: number
    location_id: number
    quantity_change: number
    status: string
  }>`
    UPDATE stock_adjustments
    SET status = 'APPROVED', approved_by = ${Number(approvedBy)}, approved_at = NOW(), notes = COALESCE(${notes ?? null}, notes)
    WHERE id = ${Number(id)} AND status = 'PENDING'
    RETURNING id, warehouse_id, sku_id, location_id, quantity_change, status
  `.execute(db)

  if (!rows[0]) throw new AppError('Stock adjustment not found or not in PENDING status', 404)

  const adj = rows[0]

  const movementType = adj.quantity_change > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REMOVE'
  await sql`
    INSERT INTO inventory_movements (sku_id, location_id, warehouse_id, quantity, movement_type, reference_type, reference_id, created_by)
    VALUES (${adj.sku_id}, ${adj.location_id}, ${adj.warehouse_id}, ${adj.quantity_change}::decimal, ${movementType}, 'STOCK_ADJUSTMENT', ${adj.id}, ${Number(approvedBy)})
  `.execute(db)

  return getStockAdjustment(id)
}

export async function rejectStockAdjustment(id: string, rejectedBy: string, notes?: string) {
  const db = getDb()

  const { rows } = await sql<{ id: number }>`
    UPDATE stock_adjustments
    SET status = 'REJECTED', approved_by = ${Number(rejectedBy)}, approved_at = NOW(), notes = COALESCE(${notes ?? null}, notes)
    WHERE id = ${Number(id)} AND status = 'PENDING'
    RETURNING id
  `.execute(db)

  if (!rows[0]) throw new AppError('Stock adjustment not found or not in PENDING status', 404)

  return getStockAdjustment(id)
}
