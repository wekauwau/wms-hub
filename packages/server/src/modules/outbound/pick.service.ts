import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { AppError } from '../../middleware/errors.js'
import { emitEvent } from '../../realtime/events.js'

interface PickTaskInfo {
  id: string
  soId: string
  soLineId: string
  skuId: string
  locationId: string
  warehouseId: string
  expectedQuantity: number
  pickedQuantity: number
  assigneeId: string | null
  status: string
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
}

interface CreatePickInput {
  soLineId: number
  locationId: number
  expectedQuantity: number
  assigneeId?: number
}

export async function createPicks(
  soId: string,
  picks: CreatePickInput[],
  _createdBy: string,
): Promise<PickTaskInfo[]> {
  const db = getDb()

  const soResult = await sql<{ id: number; status: string; warehouse_id: number }>`
    SELECT id, status, warehouse_id
    FROM sales_orders
    WHERE id = ${Number(soId)}
  `.execute(db)

  const so = soResult.rows[0]
  if (!so) throw new AppError('Sales order not found', 404)
  if (so.status === 'CANCELLED' || so.status === 'SHIPPED' || so.status === 'DELIVERED') {
    throw new AppError(`Cannot create picks for ${so.status} order`, 400)
  }

  const results: PickTaskInfo[] = []

  for (const pick of picks) {
    const lineResult = await sql<{ id: number; sku_id: number }>`
      SELECT id, sku_id
      FROM so_lines
      WHERE id = ${pick.soLineId} AND so_id = ${Number(soId)}
    `.execute(db)

    const line = lineResult.rows[0]
    if (!line) throw new AppError(`SO line ${pick.soLineId} not found`, 404)

    const { rows } = await sql<{
      id: number
      so_id: number
      so_line_id: number
      sku_id: number
      location_id: number
      warehouse_id: number
      expected_quantity: number
      picked_quantity: number
      assignee_id: number | null
      status: string
      started_at: Date | null
      completed_at: Date | null
      created_at: Date
    }>`
      INSERT INTO pick_tasks (so_id, so_line_id, sku_id, location_id, warehouse_id, expected_quantity, assignee_id, status)
      VALUES (${Number(soId)}, ${pick.soLineId}, ${line.sku_id}, ${pick.locationId}, ${so.warehouse_id}, ${pick.expectedQuantity}, ${pick.assigneeId ?? null}, 'PENDING')
      RETURNING id, so_id, so_line_id, sku_id, location_id, warehouse_id, expected_quantity, picked_quantity, assignee_id, status, started_at, completed_at, created_at
    `.execute(db)

    const task = rows[0]
    results.push({
      id: String(task.id),
      soId: String(task.so_id),
      soLineId: String(task.so_line_id),
      skuId: String(task.sku_id),
      locationId: String(task.location_id),
      warehouseId: String(task.warehouse_id),
      expectedQuantity: task.expected_quantity,
      pickedQuantity: task.picked_quantity,
      assigneeId: task.assignee_id ? String(task.assignee_id) : null,
      status: task.status,
      startedAt: task.started_at,
      completedAt: task.completed_at,
      createdAt: task.created_at,
    })
  }

  await sql`
    UPDATE sales_orders
    SET status = 'PICKING', updated_at = NOW()
    WHERE id = ${Number(soId)} AND status IN ('ALLOCATED', 'PENDING')
  `.execute(db)

  return results
}

export async function startPick(pickId: string): Promise<PickTaskInfo> {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    so_id: number
    so_line_id: number
    sku_id: number
    location_id: number
    warehouse_id: number
    expected_quantity: number
    picked_quantity: number
    assignee_id: number | null
    status: string
    started_at: Date | null
    completed_at: Date | null
    created_at: Date
  }>`
    UPDATE pick_tasks
    SET status = 'IN_PROGRESS', started_at = NOW()
    WHERE id = ${Number(pickId)} AND status = 'PENDING'
    RETURNING id, so_id, so_line_id, sku_id, location_id, warehouse_id, expected_quantity, picked_quantity, assignee_id, status, started_at, completed_at, created_at
  `.execute(db)

  const task = rows[0]
  if (!task) throw new AppError('Pick task not found or already started', 404)

  return {
    id: String(task.id),
    soId: String(task.so_id),
    soLineId: String(task.so_line_id),
    skuId: String(task.sku_id),
    locationId: String(task.location_id),
    warehouseId: String(task.warehouse_id),
    expectedQuantity: task.expected_quantity,
    pickedQuantity: task.picked_quantity,
    assigneeId: task.assignee_id ? String(task.assignee_id) : null,
    status: task.status,
    startedAt: task.started_at,
    completedAt: task.completed_at,
    createdAt: task.created_at,
  }
}

export async function completePick(pickId: string, pickedQuantity: number): Promise<PickTaskInfo> {
  const db = getDb()

  const pickResult = await sql<{
    id: number
    so_id: number
    so_line_id: number
    expected_quantity: number
  }>`
    SELECT id, so_id, so_line_id, expected_quantity
    FROM pick_tasks
    WHERE id = ${Number(pickId)}
  `.execute(db)

  const pick = pickResult.rows[0]
  if (!pick) throw new AppError('Pick task not found', 404)

  if (pickedQuantity > Number(pick.expected_quantity)) {
    throw new AppError(
      `Picked quantity (${pickedQuantity}) exceeds expected (${pick.expected_quantity})`,
      400,
    )
  }

  const { rows } = await sql<{
    id: number
    so_id: number
    so_line_id: number
    sku_id: number
    location_id: number
    warehouse_id: number
    expected_quantity: number
    picked_quantity: number
    assignee_id: number | null
    status: string
    started_at: Date | null
    completed_at: Date | null
    created_at: Date
  }>`
    UPDATE pick_tasks
    SET status = 'COMPLETED', picked_quantity = ${pickedQuantity}, completed_at = NOW()
    WHERE id = ${Number(pickId)} AND status IN ('PENDING', 'IN_PROGRESS')
    RETURNING id, so_id, so_line_id, sku_id, location_id, warehouse_id, expected_quantity, picked_quantity, assignee_id, status, started_at, completed_at, created_at
  `.execute(db)

  const task = rows[0]
  if (!task) throw new AppError('Pick task not found or already completed', 404)

  await sql`
    UPDATE so_lines
    SET picked_quantity = (
      SELECT COALESCE(SUM(picked_quantity), 0)
      FROM pick_tasks
      WHERE so_line_id = ${pick.so_line_id} AND status = 'COMPLETED'
    )
    WHERE id = ${pick.so_line_id}
  `.execute(db)

  const allPicks = await sql<{ status: string }>`
    SELECT status
    FROM pick_tasks
    WHERE so_id = ${pick.so_id}
  `.execute(db)

  const allCompleted = allPicks.rows.every((r) => r.status === 'COMPLETED')
  if (allCompleted) {
    await sql`
      UPDATE sales_orders
      SET status = 'PICKED', updated_at = NOW()
      WHERE id = ${pick.so_id}
    `.execute(db)
  }

  emitEvent({ type: 'pick.completed', data: { pickId, soId: String(pick.so_id) } })

  return {
    id: String(task.id),
    soId: String(task.so_id),
    soLineId: String(task.so_line_id),
    skuId: String(task.sku_id),
    locationId: String(task.location_id),
    warehouseId: String(task.warehouse_id),
    expectedQuantity: task.expected_quantity,
    pickedQuantity: task.picked_quantity,
    assigneeId: task.assignee_id ? String(task.assignee_id) : null,
    status: task.status,
    startedAt: task.started_at,
    completedAt: task.completed_at,
    createdAt: task.created_at,
  }
}

export async function getPicks(soId: string): Promise<PickTaskInfo[]> {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    so_id: number
    so_line_id: number
    sku_id: number
    location_id: number
    warehouse_id: number
    expected_quantity: number
    picked_quantity: number
    assignee_id: number | null
    status: string
    started_at: Date | null
    completed_at: Date | null
    created_at: Date
  }>`
    SELECT id, so_id, so_line_id, sku_id, location_id, warehouse_id, expected_quantity, picked_quantity, assignee_id, status, started_at, completed_at, created_at
    FROM pick_tasks
    WHERE so_id = ${Number(soId)}
    ORDER BY id
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    soId: String(r.so_id),
    soLineId: String(r.so_line_id),
    skuId: String(r.sku_id),
    locationId: String(r.location_id),
    warehouseId: String(r.warehouse_id),
    expectedQuantity: r.expected_quantity,
    pickedQuantity: r.picked_quantity,
    assigneeId: r.assignee_id ? String(r.assignee_id) : null,
    status: r.status,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    createdAt: r.created_at,
  }))
}

export async function getPick(pickId: string): Promise<PickTaskInfo | null> {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    so_id: number
    so_line_id: number
    sku_id: number
    location_id: number
    warehouse_id: number
    expected_quantity: number
    picked_quantity: number
    assignee_id: number | null
    status: string
    started_at: Date | null
    completed_at: Date | null
    created_at: Date
  }>`
    SELECT id, so_id, so_line_id, sku_id, location_id, warehouse_id, expected_quantity, picked_quantity, assignee_id, status, started_at, completed_at, created_at
    FROM pick_tasks
    WHERE id = ${Number(pickId)}
  `.execute(db)

  const task = rows[0]
  if (!task) return null

  return {
    id: String(task.id),
    soId: String(task.so_id),
    soLineId: String(task.so_line_id),
    skuId: String(task.sku_id),
    locationId: String(task.location_id),
    warehouseId: String(task.warehouse_id),
    expectedQuantity: task.expected_quantity,
    pickedQuantity: task.picked_quantity,
    assigneeId: task.assignee_id ? String(task.assignee_id) : null,
    status: task.status,
    startedAt: task.started_at,
    completedAt: task.completed_at,
    createdAt: task.created_at,
  }
}
