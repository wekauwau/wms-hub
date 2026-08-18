import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { AppError } from '../../middleware/errors.js'
import { emitEvent } from '../../realtime/events.js'
import { ShipSoInput } from './so.schema.js'

interface ShipmentInfo {
  id: string
  shipmentNumber: string
  soId: string
  warehouseId: string
  carrier: string | null
  trackingNumber: string | null
  shippedAt: Date | null
  createdAt: Date
  items: ShipmentItemInfo[]
}

interface ShipmentItemInfo {
  id: string
  soLineId: string
  quantity: number
}

export async function shipSo(
  soId: string,
  input: ShipSoInput,
  shippedBy: string,
): Promise<ShipmentInfo> {
  const db = getDb()

  const soResult = await sql<{ id: number; status: string; warehouse_id: number }>`
    SELECT id, status, warehouse_id
    FROM sales_orders
    WHERE id = ${Number(soId)}
  `.execute(db)

  const so = soResult.rows[0]
  if (!so) throw new AppError('Sales order not found', 404)
  if (so.status === 'CANCELLED' || so.status === 'SHIPPED' || so.status === 'DELIVERED') {
    throw new AppError(`Cannot ship ${so.status} order`, 400)
  }

  for (const item of input.items) {
    const lineResult = await sql<{ id: number; picked_quantity: number; shipped_quantity: number }>`
      SELECT id, picked_quantity, shipped_quantity
      FROM so_lines
      WHERE id = ${item.soLineId} AND so_id = ${Number(soId)}
    `.execute(db)

    const line = lineResult.rows[0]
    if (!line) throw new AppError(`SO line ${item.soLineId} not found`, 404)

    const availableToShip = Number(line.picked_quantity) - Number(line.shipped_quantity)
    if (item.quantity > availableToShip) {
      throw new AppError(
        `Ship quantity (${item.quantity}) exceeds available to ship (${availableToShip})`,
        400,
      )
    }
  }

  const shipmentNumber = `SHP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const shipmentResult = await sql<{ id: number; shipment_number: string; created_at: Date }>`
    INSERT INTO shipments (shipment_number, so_id, warehouse_id, carrier, tracking_number, shipped_at)
    VALUES (${shipmentNumber}, ${Number(soId)}, ${so.warehouse_id}, ${input.carrier ?? null}, ${input.trackingNumber ?? null}, NOW())
    RETURNING id, shipment_number, created_at
  `.execute(db)

  const shipment = shipmentResult.rows[0]

  const items: ShipmentItemInfo[] = []

  for (const item of input.items) {
    const lineResult = await sql<{ sku_id: number }>`
      SELECT sku_id FROM so_lines WHERE id = ${item.soLineId}
    `.execute(db)

    const skuId = lineResult.rows[0].sku_id

    const itemResult = await sql<{ id: number }>`
      INSERT INTO shipment_items (shipment_id, so_line_id, quantity)
      VALUES (${shipment.id}, ${item.soLineId}, ${item.quantity})
      RETURNING id
    `.execute(db)

    await sql`
      UPDATE so_lines
      SET shipped_quantity = shipped_quantity + ${item.quantity}
      WHERE id = ${item.soLineId}
    `.execute(db)

    const negQuantity = -item.quantity
    await sql`
      INSERT INTO inventory_movements (sku_id, location_id, warehouse_id, quantity, movement_type, reference_type, reference_id, created_by)
      SELECT ${skuId}, cs.location_id, ${so.warehouse_id}, ${negQuantity}::decimal, 'SHIP', 'SALES_ORDER', ${Number(soId)}, ${Number(shippedBy)}
      FROM current_stock cs
      WHERE cs.sku_id = ${skuId} AND cs.warehouse_id = ${so.warehouse_id} AND cs.on_hand >= ${item.quantity}
      LIMIT 1
    `.execute(db)

    items.push({
      id: String(itemResult.rows[0].id),
      soLineId: String(item.soLineId),
      quantity: item.quantity,
    })
  }

  const allShipped = await sql<{ remaining: number }>`
    SELECT SUM(requested_quantity - shipped_quantity) AS remaining
    FROM so_lines
    WHERE so_id = ${Number(soId)}
  `.execute(db)

  if (Number(allShipped.rows[0].remaining) === 0) {
    await sql`
      UPDATE sales_orders
      SET status = 'SHIPPED', updated_at = NOW()
      WHERE id = ${Number(soId)}
    `.execute(db)
  }

  emitEvent({
    type: 'order.shipped',
    data: { soId, shipmentId: String(shipment.id), shipmentNumber },
  })

  return {
    id: String(shipment.id),
    shipmentNumber: shipment.shipment_number,
    soId: String(soId),
    warehouseId: String(so.warehouse_id),
    carrier: input.carrier ?? null,
    trackingNumber: input.trackingNumber ?? null,
    shippedAt: new Date(),
    createdAt: shipment.created_at,
    items,
  }
}

export async function getShipment(soId: string): Promise<ShipmentInfo | null> {
  const db = getDb()

  const shipmentResult = await sql<{
    id: number
    shipment_number: string
    so_id: number
    warehouse_id: number
    carrier: string | null
    tracking_number: string | null
    shipped_at: Date | null
    created_at: Date
  }>`
    SELECT id, shipment_number, so_id, warehouse_id, carrier, tracking_number, shipped_at, created_at
    FROM shipments
    WHERE so_id = ${Number(soId)}
    ORDER BY id DESC
    LIMIT 1
  `.execute(db)

  const shipment = shipmentResult.rows[0]
  if (!shipment) return null

  const itemsResult = await sql<{ id: number; so_line_id: number; quantity: number }>`
    SELECT id, so_line_id, quantity
    FROM shipment_items
    WHERE shipment_id = ${shipment.id}
    ORDER BY id
  `.execute(db)

  return {
    id: String(shipment.id),
    shipmentNumber: shipment.shipment_number,
    soId: String(shipment.so_id),
    warehouseId: String(shipment.warehouse_id),
    carrier: shipment.carrier,
    trackingNumber: shipment.tracking_number,
    shippedAt: shipment.shipped_at,
    createdAt: shipment.created_at,
    items: itemsResult.rows.map((r) => ({
      id: String(r.id),
      soLineId: String(r.so_line_id),
      quantity: r.quantity,
    })),
  }
}

export async function getShipments(soId: string): Promise<ShipmentInfo[]> {
  const db = getDb()

  const shipmentsResult = await sql<{
    id: number
    shipment_number: string
    so_id: number
    warehouse_id: number
    carrier: string | null
    tracking_number: string | null
    shipped_at: Date | null
    created_at: Date
  }>`
    SELECT id, shipment_number, so_id, warehouse_id, carrier, tracking_number, shipped_at, created_at
    FROM shipments
    WHERE so_id = ${Number(soId)}
    ORDER BY id
  `.execute(db)

  const results: ShipmentInfo[] = []

  for (const shipment of shipmentsResult.rows) {
    const itemsResult = await sql<{ id: number; so_line_id: number; quantity: number }>`
      SELECT id, so_line_id, quantity
      FROM shipment_items
      WHERE shipment_id = ${shipment.id}
      ORDER BY id
    `.execute(db)

    results.push({
      id: String(shipment.id),
      shipmentNumber: shipment.shipment_number,
      soId: String(shipment.so_id),
      warehouseId: String(shipment.warehouse_id),
      carrier: shipment.carrier,
      trackingNumber: shipment.tracking_number,
      shippedAt: shipment.shipped_at,
      createdAt: shipment.created_at,
      items: itemsResult.rows.map((r) => ({
        id: String(r.id),
        soLineId: String(r.so_line_id),
        quantity: r.quantity,
      })),
    })
  }

  return results
}
