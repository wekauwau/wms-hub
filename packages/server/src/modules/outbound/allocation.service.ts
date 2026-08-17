import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { AppError } from '../../middleware/errors.js'
import { AllocateSoInput } from './so.schema.js'

interface AllocationResult {
  soLineId: string
  allocatedQuantity: number
  locationId: string
}

interface ReservationInfo {
  id: string
  skuId: string
  locationId: string
  quantity: number
  status: string
  createdAt: Date
}

export async function allocateSo(
  soId: string,
  input: AllocateSoInput,
  _allocatedBy: string,
): Promise<AllocationResult[]> {
  const db = getDb()

  const soResult = await sql<{ id: number; status: string; warehouse_id: number }>`
    SELECT id, status, warehouse_id
    FROM sales_orders
    WHERE id = ${Number(soId)}
  `.execute(db)

  const so = soResult.rows[0]
  if (!so) throw new AppError('Sales order not found', 404)
  if (so.status === 'CANCELLED' || so.status === 'SHIPPED' || so.status === 'DELIVERED') {
    throw new AppError(`Cannot allocate against ${so.status} order`, 400)
  }

  const results: AllocationResult[] = []

  for (const item of input.lines) {
    const lineResult = await sql<{
      id: number
      sku_id: number
      requested_quantity: number
      allocated_quantity: number
    }>`
      SELECT id, sku_id, requested_quantity, allocated_quantity
      FROM so_lines
      WHERE id = ${item.lineId} AND so_id = ${Number(soId)}
    `.execute(db)

    const line = lineResult.rows[0]
    if (!line) throw new AppError(`SO line ${item.lineId} not found`, 404)

    const currentAllocated = Number(line.allocated_quantity)
    const newAllocated = currentAllocated + item.quantity
    if (newAllocated > Number(line.requested_quantity)) {
      throw new AppError(
        `Allocated quantity (${newAllocated}) exceeds requested (${line.requested_quantity})`,
        400,
      )
    }

    const allocResult = await sql<{ allocated_quantity: number; location_id: number }>`
      SELECT * FROM allocate_stock(
        ${line.sku_id},
        ${so.warehouse_id},
        ${item.quantity},
        ${Number(soId)}
      )
    `.execute(db)

    if (allocResult.rows.length === 0) {
      throw new AppError(`No stock available for SKU ${line.sku_id}`, 400)
    }

    let totalAllocated = 0
    for (const row of allocResult.rows) {
      totalAllocated += Number(row.allocated_quantity)
    }

    await sql`
      UPDATE so_lines
      SET allocated_quantity = ${newAllocated}
      WHERE id = ${line.id}
    `.execute(db)

    await sql`
      UPDATE sales_orders
      SET status = 'ALLOCATED', updated_at = NOW()
      WHERE id = ${Number(soId)} AND status = 'PENDING'
    `.execute(db)

    results.push({
      soLineId: String(line.id),
      allocatedQuantity: totalAllocated,
      locationId: String(allocResult.rows[0].location_id),
    })
  }

  return results
}

export async function allocateSingleLine(
  soId: string,
  lineId: string,
  quantity: number,
  _allocatedBy: string,
): Promise<AllocationResult> {
  const result = await allocateSo(
    soId,
    { lines: [{ lineId: Number(lineId), quantity }] },
    allocatedBy,
  )
  return result[0]
}

export async function releaseAllocation(soId: string, lineId: string): Promise<boolean> {
  const db = getDb()

  const lineResult = await sql<{ id: number; allocated_quantity: number }>`
    SELECT id, allocated_quantity
    FROM so_lines
    WHERE id = ${Number(lineId)} AND so_id = ${Number(soId)}
  `.execute(db)

  const line = lineResult.rows[0]
  if (!line) throw new AppError('SO line not found', 404)

  if (Number(line.allocated_quantity) === 0) return false

  await sql`
    UPDATE stock_reservations
    SET status = 'RELEASED'
    WHERE sales_order_id = ${Number(soId)} AND sku_id = (
      SELECT sku_id FROM so_lines WHERE id = ${Number(lineId)}
    ) AND status = 'ACTIVE'
  `.execute(db)

  await sql`
    UPDATE so_lines
    SET allocated_quantity = 0
    WHERE id = ${Number(lineId)}
  `.execute(db)

  return true
}

export async function getAllocations(soId: string): Promise<ReservationInfo[]> {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    sku_id: number
    location_id: number
    quantity: number
    status: string
    created_at: Date
  }>`
    SELECT id, sku_id, location_id, quantity, status, created_at
    FROM stock_reservations
    WHERE sales_order_id = ${Number(soId)}
    ORDER BY id
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    skuId: String(r.sku_id),
    locationId: String(r.location_id),
    quantity: r.quantity,
    status: r.status,
    createdAt: r.created_at,
  }))
}
