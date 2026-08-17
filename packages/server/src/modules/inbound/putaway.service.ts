import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { AppError } from '../../middleware/errors.js'

interface PutawaySuggestion {
  locationId: string
  locationCode: string
  locationName: string
  capacity: number | null
  currentQuantity: number
  availableCapacity: number | null
}

interface PutawayConfirmInput {
  skuId: number
  locationId: number
  quantity: number
  poId?: number
  notes?: string
}

interface PutawayConfirmResult {
  movementId: string
  skuId: string
  locationId: string
  quantity: number
}

export async function suggestPutawayLocations(
  warehouseId: string,
  skuId: string,
  quantity: number,
): Promise<PutawaySuggestion[]> {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    code: string
    name: string
    capacity: number | null
    current_quantity: number
    available_capacity: number | null
  }>`
    SELECT
      l.id,
      l.code,
      l.name,
      l.capacity,
      COALESCE(cs.on_hand, 0) AS current_quantity,
      CASE
        WHEN l.capacity IS NOT NULL THEN l.capacity - COALESCE(cs.on_hand, 0)
        ELSE NULL
      END AS available_capacity
    FROM locations l
    LEFT JOIN current_stock cs
      ON cs.location_id = l.id AND cs.sku_id = ${Number(skuId)}
    WHERE l.warehouse_id = ${Number(warehouseId)}
      AND l.type = 'BIN'
      AND l.is_active = TRUE
      AND (l.capacity IS NULL OR l.capacity - COALESCE(cs.on_hand, 0) >= ${quantity})
    ORDER BY l.code
  `.execute(db)

  return rows.map((r) => ({
    locationId: String(r.id),
    locationCode: r.code,
    locationName: r.name,
    capacity: r.capacity,
    currentQuantity: r.current_quantity,
    availableCapacity: r.available_capacity,
  }))
}

export async function confirmPutaway(
  input: PutawayConfirmInput,
  performedBy: string,
): Promise<PutawayConfirmResult> {
  const db = getDb()

  const location = await sql<{ id: number; warehouse_id: number; capacity: number | null }>`
    SELECT id, warehouse_id, capacity
    FROM locations
    WHERE id = ${input.locationId} AND type = 'BIN' AND is_active = TRUE
  `.execute(db)

  if (!location.rows[0]) throw new AppError('Location not found or inactive', 404)

  const warehouseId = location.rows[0].warehouse_id

  if (location.rows[0].capacity !== null) {
    const stock = await sql<{ on_hand: number }>`
      SELECT COALESCE(on_hand, 0) AS on_hand
      FROM current_stock
      WHERE sku_id = ${input.skuId} AND location_id = ${input.locationId} AND warehouse_id = ${warehouseId}
    `.execute(db)

    const current = stock.rows[0]?.on_hand ?? 0
    if (current + input.quantity > location.rows[0].capacity) {
      throw new AppError('Exceeds location capacity', 400)
    }
  }

  const movement = await sql<{ id: number }>`
    INSERT INTO inventory_movements (sku_id, location_id, warehouse_id, quantity, movement_type, reference_type, reference_id, reason_code, notes, created_by)
    VALUES (
      ${input.skuId},
      ${input.locationId},
      ${warehouseId},
      ${input.quantity},
      'PUTAWAY',
      ${input.poId ? 'PURCHASE_ORDER' : null},
      ${input.poId ?? null},
      'RECEIVING',
      ${input.notes ?? null},
      ${Number(performedBy)}
    )
    RETURNING id
  `.execute(db)

  await sql`
    INSERT INTO current_stock (sku_id, location_id, warehouse_id, on_hand)
    VALUES (${input.skuId}, ${input.locationId}, ${warehouseId}, ${input.quantity})
    ON CONFLICT (sku_id, location_id, warehouse_id)
    DO UPDATE SET
      on_hand = current_stock.on_hand + ${input.quantity},
      updated_at = NOW()
  `.execute(db)

  return {
    movementId: String(movement.rows[0].id),
    skuId: String(input.skuId),
    locationId: String(input.locationId),
    quantity: input.quantity,
  }
}
