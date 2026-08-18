import { api } from './api'

export interface DashboardKpi {
  warehouseId: string
  warehouseCode: string
  totalSkus: number
  totalUnitsOnHand: number
  totalUnitsReserved: number
  totalUnitsAvailable: number
  openOrders: number
  openPos: number
  openExceptions: number
}

export interface LocationUsage {
  locationId: string
  locationCode: string
  locationType: string
  capacity: number | null
  capacityUnit: string | null
  currentUnits: number
  utilizationPct: number | null
}

export interface StockSummary {
  skuId: string
  skuCode: string
  skuName: string
  warehouseId: string
  warehouseCode: string
  totalOnHand: number
  totalReserved: number
  totalAvailable: number
  locationCount: number
}

export const reportsApi = {
  getDashboardKpi: (warehouseId?: string) =>
    api.get<DashboardKpi[]>(`/reports/kpi${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),

  getLocationUsage: () => api.get<LocationUsage[]>('/reports/location-usage'),

  getStockSummary: (warehouseId?: string) =>
    api.get<StockSummary[]>(
      `/reports/stock-summary${warehouseId ? `?warehouseId=${warehouseId}` : ''}`,
    ),
}
