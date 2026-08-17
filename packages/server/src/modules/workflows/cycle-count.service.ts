import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { AppError } from '../../middleware/errors.js'
import {
  CountCycleCountInput,
  CreateCycleCountInput,
  ReconcileCycleCountInput,
} from './cycle-count.schema.js'

interface CycleCountLineInfo {
  id: string
  cycleCountId: string
  skuId: string
  locationId: string
  expectedQuantity: number
  countedQuantity: number | null
  variance: number | null
  countedBy: string | null
  countedAt: Date | null
}

export async function listCycleCounts(warehouseId?: string) {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    count_number: string
    warehouse_id: number
    location_id: number | null
    status: string
    initiated_by: number
    reconciled_by: number | null
    created_at: Date
    reconciled_at: Date | null
  }>`
    SELECT id, count_number, warehouse_id, location_id, status, initiated_by, reconciled_by, created_at, reconciled_at
    FROM cycle_counts
    ${warehouseId ? sql`WHERE warehouse_id = ${Number(warehouseId)}` : sql``}
    ORDER BY id DESC
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    countNumber: r.count_number,
    warehouseId: String(r.warehouse_id),
    locationId: r.location_id ? String(r.location_id) : null,
    status: r.status,
    initiatedBy: String(r.initiated_by),
    reconciledBy: r.reconciled_by ? String(r.reconciled_by) : null,
    createdAt: r.created_at,
    reconciledAt: r.reconciled_at,
  }))
}

export async function getCycleCount(id: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    count_number: string
    warehouse_id: number
    location_id: number | null
    status: string
    initiated_by: number
    reconciled_by: number | null
    created_at: Date
    reconciled_at: Date | null
  }>`
    SELECT id, count_number, warehouse_id, location_id, status, initiated_by, reconciled_by, created_at, reconciled_at
    FROM cycle_counts
    WHERE id = ${Number(id)}
  `.execute(db)

  const cc = rows[0]
  if (!cc) return null

  const lines = await getCycleCountLines(id)

  return {
    id: String(cc.id),
    countNumber: cc.count_number,
    warehouseId: String(cc.warehouse_id),
    locationId: cc.location_id ? String(cc.location_id) : null,
    status: cc.status,
    initiatedBy: String(cc.initiated_by),
    reconciledBy: cc.reconciled_by ? String(cc.reconciled_by) : null,
    createdAt: cc.created_at,
    reconciledAt: cc.reconciled_at,
    lines,
  }
}

export async function getCycleCountLines(cycleCountId: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    cycle_count_id: number
    sku_id: number
    location_id: number
    expected_quantity: number
    counted_quantity: number | null
    variance: number | null
    counted_by: number | null
    counted_at: Date | null
  }>`
    SELECT id, cycle_count_id, sku_id, location_id, expected_quantity, counted_quantity, variance, counted_by, counted_at
    FROM cycle_count_lines
    WHERE cycle_count_id = ${Number(cycleCountId)}
    ORDER BY id
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    cycleCountId: String(r.cycle_count_id),
    skuId: String(r.sku_id),
    locationId: String(r.location_id),
    expectedQuantity: r.expected_quantity,
    countedQuantity: r.counted_quantity,
    variance: r.variance,
    countedBy: r.counted_by ? String(r.counted_by) : null,
    countedAt: r.counted_at,
  }))
}

export async function createCycleCount(input: CreateCycleCountInput, createdBy: string) {
  const db = getDb()

  const countNumber = `CC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const { rows } = await sql<{
    id: number
    count_number: string
    warehouse_id: number
    location_id: number | null
    status: string
    initiated_by: number
    created_at: Date
  }>`
    INSERT INTO cycle_counts (count_number, warehouse_id, location_id, status, initiated_by)
    VALUES (${countNumber}, ${input.warehouseId}, ${input.locationId ?? null}, 'DRAFT', ${Number(createdBy)})
    RETURNING id, count_number, warehouse_id, location_id, status, initiated_by, created_at
  `.execute(db)

  const cc = rows[0]

  const lines: CycleCountLineInfo[] = []

  for (const line of input.lines) {
    const { rows: lineRows } = await sql<{
      id: number
      cycle_count_id: number
      sku_id: number
      location_id: number
      expected_quantity: number
      counted_quantity: number | null
      variance: number | null
      counted_by: number | null
      counted_at: Date | null
    }>`
      INSERT INTO cycle_count_lines (cycle_count_id, sku_id, location_id, expected_quantity)
      VALUES (${cc.id}, ${line.skuId}, ${line.locationId}, ${line.expectedQuantity})
      RETURNING id, cycle_count_id, sku_id, location_id, expected_quantity, counted_quantity, variance, counted_by, counted_at
    `.execute(db)

    const l = lineRows[0]
    lines.push({
      id: String(l.id),
      cycleCountId: String(l.cycle_count_id),
      skuId: String(l.sku_id),
      locationId: String(l.location_id),
      expectedQuantity: l.expected_quantity,
      countedQuantity: l.counted_quantity,
      variance: l.variance,
      countedBy: l.counted_by ? String(l.counted_by) : null,
      countedAt: l.counted_at,
    })
  }

  return {
    id: String(cc.id),
    countNumber: cc.count_number,
    warehouseId: String(cc.warehouse_id),
    locationId: cc.location_id ? String(cc.location_id) : null,
    status: cc.status,
    initiatedBy: String(cc.initiated_by),
    createdAt: cc.created_at,
    reconciledBy: null,
    reconciledAt: null,
    lines,
  }
}

export async function startCycleCount(id: string) {
  const db = getDb()

  const { rows } = await sql<{ id: number; status: string }>`
    UPDATE cycle_counts
    SET status = 'IN_PROGRESS'
    WHERE id = ${Number(id)} AND status = 'DRAFT'
    RETURNING id, status
  `.execute(db)

  if (!rows[0]) throw new AppError('Cycle count not found or not in DRAFT status', 404)
  return rows[0].status
}

export async function countCycleCount(id: string, input: CountCycleCountInput, countedBy: string) {
  const db = getDb()

  const ccResult = await sql<{ id: number; status: string }>`
    SELECT id, status FROM cycle_counts WHERE id = ${Number(id)}
  `.execute(db)

  if (!ccResult.rows[0]) throw new AppError('Cycle count not found', 404)
  if (ccResult.rows[0].status !== 'IN_PROGRESS' && ccResult.rows[0].status !== 'DRAFT') {
    throw new AppError('Cycle count is not in IN_PROGRESS or DRAFT status', 400)
  }

  if (ccResult.rows[0].status === 'DRAFT') {
    await startCycleCount(id)
  }

  for (const line of input.lines) {
    const lineResult = await sql<{ id: number }>`
      SELECT id FROM cycle_count_lines WHERE id = ${line.lineId} AND cycle_count_id = ${Number(id)}
    `.execute(db)

    if (!lineResult.rows[0]) throw new AppError(`Cycle count line ${line.lineId} not found`, 404)

    await sql`
      UPDATE cycle_count_lines
      SET counted_quantity = ${line.countedQuantity}, counted_by = ${Number(countedBy)}, counted_at = NOW()
      WHERE id = ${line.lineId}
    `.execute(db)
  }

  await sql`
    UPDATE cycle_counts
    SET status = 'SUBMITTED'
    WHERE id = ${Number(id)} AND status IN ('DRAFT', 'IN_PROGRESS')
  `.execute(db)

  return getCycleCount(id)
}

export async function reconcileCycleCount(
  id: string,
  input: ReconcileCycleCountInput,
  reconciledBy: string,
) {
  const db = getDb()

  const ccResult = await sql<{ id: number; status: string; warehouse_id: number }>`
    SELECT id, status, warehouse_id FROM cycle_counts WHERE id = ${Number(id)}
  `.execute(db)

  if (!ccResult.rows[0]) throw new AppError('Cycle count not found', 404)
  if (ccResult.rows[0].status !== 'SUBMITTED') {
    throw new AppError('Cycle count is not in SUBMITTED status', 400)
  }

  for (const line of input.lines) {
    const lineResult = await sql<{
      id: number
      sku_id: number
      location_id: number
      expected_quantity: number
      counted_quantity: number | null
    }>`
      SELECT id, sku_id, location_id, expected_quantity, counted_quantity
      FROM cycle_count_lines
      WHERE id = ${line.lineId} AND cycle_count_id = ${Number(id)}
    `.execute(db)

    const lineData = lineResult.rows[0]
    if (!lineData) throw new AppError(`Cycle count line ${line.lineId} not found`, 404)

    if (line.action === 'ADJUST' && lineData.counted_quantity !== null) {
      const adjustment = Number(lineData.counted_quantity) - Number(lineData.expected_quantity)
      if (adjustment !== 0) {
        const movementType = adjustment > 0 ? 'CYCLE_COUNT_ADJUSTMENT' : 'CYCLE_COUNT_ADJUSTMENT'
        await sql`
          INSERT INTO inventory_movements (sku_id, location_id, warehouse_id, quantity, movement_type, reference_type, reference_id, created_by)
          VALUES (${lineData.sku_id}, ${lineData.location_id}, ${ccResult.rows[0].warehouse_id}, ${adjustment}::decimal, ${movementType}, 'CYCLE_COUNT', ${Number(id)}, ${Number(reconciledBy)})
        `.execute(db)
      }
    }
  }

  await sql`
    UPDATE cycle_counts
    SET status = 'RECONCILED', reconciled_by = ${Number(reconciledBy)}, reconciled_at = NOW()
    WHERE id = ${Number(id)}
  `.execute(db)

  return getCycleCount(id)
}

export async function cancelCycleCount(id: string) {
  const db = getDb()

  const { rows } = await sql<{ id: number }>`
    UPDATE cycle_counts
    SET status = 'CANCELLED'
    WHERE id = ${Number(id)} AND status IN ('DRAFT', 'IN_PROGRESS')
    RETURNING id
  `.execute(db)

  if (!rows[0]) throw new AppError('Cycle count not found or cannot be cancelled', 404)
  return true
}
