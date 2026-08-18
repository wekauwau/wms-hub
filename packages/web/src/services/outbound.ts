import { api } from './api'

export interface SoLine {
  id: string
  soId: string
  skuId: string
  requestedQuantity: number
  allocatedQuantity: number
  pickedQuantity: number
  packedQuantity: number
  shippedQuantity: number
  createdAt: string
}

export interface So {
  id: string
  orderNumber: string
  warehouseId: string
  customerName: string | null
  customerAddress: string | null
  status: string
  priority: number
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  lines?: SoLine[]
}

export interface CreateSoInput {
  orderNumber: string
  warehouseId: number
  customerName?: string
  customerAddress?: string
  priority?: number
  notes?: string
}

export interface AddSoLineInput {
  skuId: number
  requestedQuantity: number
}

export interface AllocationResult {
  soLineId: string
  allocatedQuantity: number
  locationId: string
}

export interface ReservationInfo {
  id: string
  skuId: string
  locationId: string
  quantity: number
  status: string
  createdAt: string
}

export interface PickTask {
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
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface ShipmentItem {
  id: string
  soLineId: string
  quantity: number
}

export interface Shipment {
  id: string
  shipmentNumber: string
  soId: string
  warehouseId: string
  carrier: string | null
  trackingNumber: string | null
  shippedAt: string | null
  createdAt: string
  items: ShipmentItem[]
}

export const outboundApi = {
  listSos: () => api.get<So[]>('/outbound/so'),

  getSo: (id: string) => api.get<So>(`/outbound/so/${id}`),

  createSo: (input: CreateSoInput) => api.post<So>('/outbound/so', input),

  updateSo: (id: string, input: Partial<CreateSoInput & { status: string }>) =>
    api.put<So>(`/outbound/so/${id}`, input),

  deleteSo: (id: string) => api.delete<void>(`/outbound/so/${id}`),

  addSoLine: (id: string, input: AddSoLineInput) =>
    api.post<SoLine>(`/outbound/so/${id}/lines`, input),

  deleteSoLine: (id: string, lineId: string) =>
    api.delete<void>(`/outbound/so/${id}/lines/${lineId}`),

  getAllocations: (id: string) => api.get<ReservationInfo[]>(`/outbound/so/${id}/allocations`),

  allocateSo: (id: string, lines: { lineId: number; quantity: number }[]) =>
    api.post<{ allocated: AllocationResult[] }>(`/outbound/so/${id}/allocate`, { lines }),

  releaseAllocation: (id: string, lineId: string) =>
    api.delete<void>(`/outbound/so/${id}/allocate/${lineId}`),

  getPicks: (id: string) => api.get<PickTask[]>(`/outbound/so/${id}/picks`),

  createPicks: (
    id: string,
    picks: { soLineId: number; locationId: number; expectedQuantity: number }[],
  ) => api.post<PickTask[]>(`/outbound/so/${id}/picks`, { picks }),

  completePick: (id: string, pickId: string, pickedQuantity: number) =>
    api.post<PickTask>(`/outbound/so/${id}/picks/${pickId}/complete`, { pickedQuantity }),

  shipSo: (
    id: string,
    input: {
      carrier?: string
      trackingNumber?: string
      items: { soLineId: number; quantity: number }[]
    },
  ) => api.post<Shipment>(`/outbound/so/${id}/ship`, input),

  getShipment: (id: string) => api.get<Shipment>(`/outbound/so/${id}/shipment`),
}
