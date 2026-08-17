import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { AppError } from '../../middleware/errors.js'
import { CreateStockTransferInput } from './stock-transfer.schema.js'

export async function listStockTransfers(warehouseId?: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    transfer_number: string
    sku_id: number
    from_warehouse_id: number
    from_location_id: number
    to_warehouse_id: number
    to_location_id: number
    quantity: number
    status: string
    requested_by: number
    completed_by: number | null
    created_at: Date
    completed_at: Date | null
  }>`
    SELECT id, transfer_number, sku_id, from_warehouse_id, from_location_id,
           to_warehouse_id, to_location_id, quantity, status, requested_by, completed_by, created_at, completed_at
    FROM stock_transfers
    ${warehouseId ? sql`WHERE from_warehouse_id = ${Number(warehouseId)} OR to_warehouse_id = ${Number(warehouseId)}` : sql``}
    ORDER BY id DESC
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    transferNumber: r.transfer_number,
    skuId: String(r.sku_id),
    fromWarehouseId: String(r.from_warehouse_id),
    fromLocationId: String(r.from_location_id),
    toWarehouseId: String(r.to_warehouse_id),
    toLocationId: String(r.to_location_id),
    quantity: r.quantity,
    status: r.status,
    requestedBy: String(r.requested_by),
    completedBy: r.completed_by ? String(r.completed_by) : null,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  }))
}

export async function getStockTransfer(id: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    transfer_number: string
    sku_id: number
    from_warehouse_id: number
    from_location_id: number
    to_warehouse_id: number
    to_location_id: number
    quantity: number
    status: string
    requested_by: number
    completed_by: number | null
    created_at: Date
    completed_at: Date | null
  }>`
    SELECT id, transfer_number, sku_id, from_warehouse_id, from_location_id,
           to_warehouse_id, to_location_id, quantity, status, requested_by, completed_by, created_at, completed_at
    FROM stock_transfers
    WHERE id = ${Number(id)}
  `.execute(db)

  const t = rows[0]
  if (!t) return null

  return {
    id: String(t.id),
    transferNumber: t.transfer_number,
    skuId: String(t.sku_id),
    fromWarehouseId: String(t.from_warehouse_id),
    fromLocationId: String(t.from_location_id),
    toWarehouseId: String(t.to_warehouse_id),
    toLocationId: String(t.to_location_id),
    quantity: t.quantity,
    status: t.status,
    requestedBy: String(t.requested_by),
    completedBy: t.completed_by ? String(t.completed_by) : null,
    createdAt: t.created_at,
    completedAt: t.completed_at,
  }
}

export async function createStockTransfer(input: CreateStockTransferInput, requestedBy: string) {
  const db = getDb()

  const transferNumber = `TRF-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const { rows } = await sql<{
    id: number
    transfer_number: string
    sku_id: number
    from_warehouse_id: number
    from_location_id: number
    to_warehouse_id: number
    to_location_id: number
    quantity: number
    status: string
    requested_by: number
    created_at: Date
  }>`
    INSERT INTO stock_transfers (transfer_number, sku_id, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, quantity, status, requested_by)
    VALUES (${transferNumber}, ${input.skuId}, ${input.fromWarehouseId}, ${input.fromLocationId}, ${input.toWarehouseId}, ${input.toLocationId}, ${input.quantity}::decimal, 'PENDING', ${Number(requestedBy)})
    RETURNING id, transfer_number, sku_id, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, quantity, status, requested_by, created_at
  `.execute(db)

  const t = rows[0]
  return {
    id: String(t.id),
    transferNumber: t.transfer_number,
    skuId: String(t.sku_id),
    fromWarehouseId: String(t.from_warehouse_id),
    fromLocationId: String(t.from_location_id),
    toWarehouseId: String(t.to_warehouse_id),
    toLocationId: String(t.to_location_id),
    quantity: t.quantity,
    status: t.status,
    requestedBy: String(t.requested_by),
    completedBy: null,
    createdAt: t.created_at,
    completedAt: null,
  }
}

export async function completeStockTransfer(id: string, completedBy: string) {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    sku_id: number
    from_warehouse_id: number
    from_location_id: number
    to_warehouse_id: number
    to_location_id: number
    quantity: number
    status: string
  }>`
    UPDATE stock_transfers
    SET status = 'COMPLETED', completed_by = ${Number(completedBy)}, completed_at = NOW()
    WHERE id = ${Number(id)} AND status = 'PENDING'
    RETURNING id, sku_id, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, quantity, status
  `.execute(db)

  if (!rows[0]) throw new AppError('Stock transfer not found or not in PENDING status', 404)

  const t = rows[0]

  const negQuantity = -t.quantity
  await sql`
    INSERT INTO inventory_movements (sku_id, location_id, warehouse_id, quantity, movement_type, reference_type, reference_id, created_by)
    VALUES (${t.sku_id}, ${t.from_location_id}, ${t.from_warehouse_id}, ${negQuantity}::decimal, 'TRANSFER_OUT', 'STOCK_TRANSFER', ${t.id}, ${Number(completedBy)})
  `.execute(db)

  await sql`
    INSERT INTO inventory_movements (sku_id, location_id, warehouse_id, quantity, movement_type, reference_type, reference_id, created_by)
    VALUES (${t.sku_id}, ${t.to_location_id}, ${t.to_warehouse_id}, ${t.quantity}::decimal, 'TRANSFER_IN', 'STOCK_TRANSFER', ${t.id}, ${Number(completedBy)})
  `.execute(db)

  return getStockTransfer(id)
}

export async function cancelStockTransfer(id: string) {
  const db = getDb()

  const { rows } = await sql<{ id: number }>`
    UPDATE stock_transfers
    SET status = 'CANCELLED'
    WHERE id = ${Number(id)} AND status = 'PENDING'
    RETURNING id
  `.execute(db)

  if (!rows[0]) throw new AppError('Stock transfer not found or cannot be cancelled', 404)
  return true
}
