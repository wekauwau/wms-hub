import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { AppError } from '../../middleware/errors.js'
import { ReceivePoInput } from './po.schema.js'

interface ReceiveLineResult {
  lineId: string
  skuId: string
  receivedQuantity: number
}

export async function receivePo(
  poId: string,
  input: ReceivePoInput,
  receivedBy: string,
): Promise<ReceiveLineResult[]> {
  const db = getDb()

  const poResult = await sql<{ id: number; status: string; warehouse_id: number }>`
    SELECT id, status, warehouse_id
    FROM purchase_orders
    WHERE id = ${Number(poId)}
  `.execute(db)

  const po = poResult.rows[0]
  if (!po) throw new AppError('Purchase order not found', 404)
  if (po.status === 'CANCELLED' || po.status === 'CLOSED') {
    throw new AppError(`Cannot receive against ${po.status} PO`, 400)
  }

  const stagingResult = await sql<{ id: number }>`
    SELECT id FROM locations
    WHERE warehouse_id = ${po.warehouse_id} AND code = 'STAGING' AND type = 'BIN'
    LIMIT 1
  `.execute(db)

  if (!stagingResult.rows[0]) {
    throw new AppError('No STAGING location found for this warehouse', 400)
  }
  const stagingLocationId = stagingResult.rows[0].id

  const results: ReceiveLineResult[] = []

  for (const item of input.lines) {
    const lineResult = await sql<{
      id: number
      sku_id: number
      expected_quantity: number
      received_quantity: number
    }>`
      SELECT id, sku_id, expected_quantity, received_quantity
      FROM po_lines
      WHERE id = ${item.lineId} AND po_id = ${Number(poId)}
    `.execute(db)

    const line = lineResult.rows[0]
    if (!line) throw new AppError(`PO line ${item.lineId} not found`, 404)

    const newReceived = Number(line.received_quantity) + item.receivedQuantity
    if (newReceived > Number(line.expected_quantity)) {
      throw new AppError(
        `Received quantity (${newReceived}) exceeds expected (${line.expected_quantity})`,
        400,
      )
    }

    await sql`
      UPDATE po_lines
      SET received_quantity = ${newReceived}
      WHERE id = ${line.id}
    `.execute(db)

    await sql`
      INSERT INTO inventory_movements (sku_id, location_id, warehouse_id, quantity, movement_type, reference_type, reference_id, created_by)
      VALUES (${line.sku_id}, ${stagingLocationId}, ${po.warehouse_id}, ${item.receivedQuantity}, 'RECEIPT', 'PURCHASE_ORDER', ${Number(poId)}, ${Number(receivedBy)})
    `.execute(db)

    results.push({
      lineId: String(line.id),
      skuId: String(line.sku_id),
      receivedQuantity: item.receivedQuantity,
    })
  }

  await updatePoStatus(poId)

  return results
}

export async function receiveSingleLine(
  poId: string,
  lineId: string,
  receivedQuantity: number,
  receivedBy: string,
): Promise<ReceiveLineResult> {
  const result = await receivePo(
    poId,
    { lines: [{ lineId: Number(lineId), receivedQuantity }] },
    receivedBy,
  )
  return result[0]
}

async function updatePoStatus(poId: string) {
  const db = getDb()

  const lines = await sql<{ expected_quantity: number; received_quantity: number }>`
    SELECT expected_quantity, received_quantity
    FROM po_lines
    WHERE po_id = ${Number(poId)}
  `.execute(db)

  if (lines.rows.length === 0) return

  const totalExpected = lines.rows.reduce((sum, l) => sum + Number(l.expected_quantity), 0)
  const totalReceived = lines.rows.reduce((sum, l) => sum + Number(l.received_quantity), 0)

  let newStatus: string
  if (totalReceived === 0) {
    newStatus = 'SUBMITTED'
  } else if (totalReceived < totalExpected) {
    newStatus = 'PARTIALLY_RECEIVED'
  } else {
    newStatus = 'RECEIVED'
  }

  await sql`
    UPDATE purchase_orders
    SET status = ${newStatus}, updated_at = NOW()
    WHERE id = ${Number(poId)}
  `.execute(db)
}

export async function getReceivingSummary(poId: string) {
  const db = getDb()

  const { rows } = await sql<{
    line_id: number
    sku_id: number
    expected_quantity: number
    received_quantity: number
    remaining: number
  }>`
    SELECT
      pl.id AS line_id,
      pl.sku_id,
      pl.expected_quantity,
      pl.received_quantity,
      pl.expected_quantity - pl.received_quantity AS remaining
    FROM po_lines pl
    WHERE pl.po_id = ${Number(poId)}
    ORDER BY pl.id
  `.execute(db)

  return rows.map((r) => ({
    lineId: String(r.line_id),
    skuId: String(r.sku_id),
    expectedQuantity: r.expected_quantity,
    receivedQuantity: r.received_quantity,
    remaining: r.remaining,
  }))
}
