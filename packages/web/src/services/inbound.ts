import { api } from './api'

export interface PoLine {
  id: string
  poId: string
  skuId: string
  expectedQuantity: number
  receivedQuantity: number
  unitCost: number | null
  createdAt: string
}

export interface Po {
  id: string
  poNumber: string
  warehouseId: string
  supplierName: string | null
  expectedDate: string | null
  status: string
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  lines?: PoLine[]
}

export interface CreatePoInput {
  poNumber: string
  warehouseId: number
  supplierName?: string
  expectedDate?: string
  notes?: string
}

export interface AddPoLineInput {
  skuId: number
  expectedQuantity: number
  unitCost?: number
}

export interface ReceiveLineResult {
  lineId: string
  skuId: string
  receivedQuantity: number
}

export interface ReceivingSummaryItem {
  lineId: string
  skuId: string
  expectedQuantity: number
  receivedQuantity: number
  remaining: number
}

export interface PutawaySuggestion {
  locationId: string
  locationCode: string
  locationName: string
  capacity: number | null
  currentQuantity: number
  availableCapacity: number | null
}

export interface PutawayConfirmResult {
  movementId: string
  skuId: string
  locationId: string
  quantity: number
}

export const inboundApi = {
  listPos: () => api.get<Po[]>('/inbound/po'),

  getPo: (id: string) => api.get<Po>(`/inbound/po/${id}`),

  createPo: (input: CreatePoInput) => api.post<Po>('/inbound/po', input),

  updatePo: (id: string, input: Partial<CreatePoInput & { status: string }>) =>
    api.put<Po>(`/inbound/po/${id}`, input),

  deletePo: (id: string) => api.delete<void>(`/inbound/po/${id}`),

  addPoLine: (id: string, input: AddPoLineInput) =>
    api.post<PoLine>(`/inbound/po/${id}/lines`, input),

  deletePoLine: (id: string, lineId: string) =>
    api.delete<void>(`/inbound/po/${id}/lines/${lineId}`),

  getReceivingSummary: (id: string) =>
    api.get<ReceivingSummaryItem[]>(`/inbound/po/${id}/receive/summary`),

  receivePo: (id: string, lines: { lineId: number; receivedQuantity: number }[]) =>
    api.post<{ received: ReceiveLineResult[] }>(`/inbound/po/${id}/receive`, { lines }),

  receiveLine: (id: string, lineId: string, receivedQuantity: number) =>
    api.post<ReceiveLineResult>(`/inbound/po/${id}/receive/${lineId}`, { receivedQuantity }),

  suggestPutaway: (input: { warehouseId: number; skuId: number; quantity: number }) =>
    api.post<PutawaySuggestion[]>('/inbound/putaway/suggestions', input),

  confirmPutaway: (input: {
    skuId: number
    locationId: number
    quantity: number
    poId?: number
    notes?: string
  }) => api.post<PutawayConfirmResult>('/inbound/putaway/confirm', input),
}
