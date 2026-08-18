import { broadcast } from './hub.js'

export type RealtimeEvent =
  | {
      type: 'stock.moved'
      data: { movementId: string; skuId: string; warehouseId: string; quantity: number }
    }
  | { type: 'po.received'; data: { poId: string; poNumber?: string; lineId?: string } }
  | { type: 'putaway.confirmed'; data: { movementId: string; skuId: string; locationId: string } }
  | { type: 'pick.completed'; data: { pickId: string; soId: string } }
  | { type: 'order.shipped'; data: { soId: string; shipmentId: string; shipmentNumber: string } }
  | { type: 'cycle-count.reconciled'; data: { cycleCountId: string; variances: number } }
  | { type: 'adjustment.approved'; data: { adjustmentId: string; skuId: string } }
  | { type: 'transfer.completed'; data: { transferId: string; skuId: string } }

export function emitEvent(event: RealtimeEvent) {
  broadcast(event.type, event.data)
}
