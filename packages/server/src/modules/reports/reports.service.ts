import { sql } from 'kysely'
import { getDb } from '../../config/db.js'

export async function getDashboardKpi(warehouseId?: string) {
  const db = getDb()
  const { rows } = await sql<{
    warehouse_id: number
    warehouse_code: string
    total_skus: string
    total_units_on_hand: string
    total_units_reserved: string
    total_units_available: string
    open_orders: string
    open_pos: string
    open_exceptions: string
  }>`
    SELECT
      warehouse_id,
      warehouse_code,
      COALESCE(total_skus, 0) AS total_skus,
      COALESCE(total_units_on_hand, 0) AS total_units_on_hand,
      COALESCE(total_units_reserved, 0) AS total_units_reserved,
      COALESCE(total_units_available, 0) AS total_units_available,
      COALESCE(open_orders, 0) AS open_orders,
      COALESCE(open_pos, 0) AS open_pos,
      COALESCE(open_exceptions, 0) AS open_exceptions
    FROM v_dashboard_kpi
    ${warehouseId ? sql`WHERE warehouse_id = ${Number(warehouseId)}` : sql``}
    ORDER BY warehouse_code
  `.execute(db)

  return rows.map((r) => ({
    warehouseId: String(r.warehouse_id),
    warehouseCode: r.warehouse_code,
    totalSkus: Number(r.total_skus),
    totalUnitsOnHand: Number(r.total_units_on_hand),
    totalUnitsReserved: Number(r.total_units_reserved),
    totalUnitsAvailable: Number(r.total_units_available),
    openOrders: Number(r.open_orders),
    openPos: Number(r.open_pos),
    openExceptions: Number(r.open_exceptions),
  }))
}

export async function getLocationUsage() {
  const db = getDb()
  const { rows } = await sql<{
    location_id: number
    location_code: string
    location_type: string
    capacity: string | null
    capacity_unit: string | null
    current_units: string
    utilization_pct: string | null
  }>`
    SELECT
      location_id,
      location_code,
      location_type,
      capacity,
      capacity_unit,
      current_units,
      utilization_pct
    FROM v_location_usage
    ORDER BY location_code
  `.execute(db)

  return rows.map((r) => ({
    locationId: String(r.location_id),
    locationCode: r.location_code,
    locationType: r.location_type,
    capacity: r.capacity === null ? null : Number(r.capacity),
    capacityUnit: r.capacity_unit,
    currentUnits: Number(r.current_units),
    utilizationPct: r.utilization_pct === null ? null : Number(r.utilization_pct),
  }))
}

export async function getStockSummary(warehouseId?: string) {
  const db = getDb()
  const { rows } = await sql<{
    sku_id: number
    sku_code: string
    sku_name: string
    warehouse_id: number
    warehouse_code: string
    total_on_hand: string
    total_reserved: string
    total_available: string
    location_count: string
  }>`
    SELECT
      sku_id,
      sku_code,
      sku_name,
      warehouse_id,
      warehouse_code,
      COALESCE(total_on_hand, 0) AS total_on_hand,
      COALESCE(total_reserved, 0) AS total_reserved,
      COALESCE(total_available, 0) AS total_available,
      COALESCE(location_count, 0) AS location_count
    FROM v_stock_summary
    ${warehouseId ? sql`WHERE warehouse_id = ${Number(warehouseId)}` : sql``}
    ORDER BY sku_code, warehouse_code
  `.execute(db)

  return rows.map((r) => ({
    skuId: String(r.sku_id),
    skuCode: r.sku_code,
    skuName: r.sku_name,
    warehouseId: String(r.warehouse_id),
    warehouseCode: r.warehouse_code,
    totalOnHand: Number(r.total_on_hand),
    totalReserved: Number(r.total_reserved),
    totalAvailable: Number(r.total_available),
    locationCount: Number(r.location_count),
  }))
}
