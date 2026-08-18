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

type Handler = (event: RealtimeEvent) => void

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function wsUrl(): string {
  const base = BASE_URL.replace(/\/api\/?$/, '')
  const protocol = base.startsWith('https') ? 'wss' : 'ws'
  return `${protocol}://${base.replace(/^https?:\/\//, '')}/ws`
}

class RealtimeClient {
  private socket: WebSocket | null = null
  private handlers = new Set<Handler>()
  private connectionHandlers = new Set<(connected: boolean) => void>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private closedByUser = false

  connect() {
    if (this.socket) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    this.closedByUser = false

    const url = `${wsUrl()}?token=${encodeURIComponent(token)}`
    this.socket = new WebSocket(url)

    this.socket.onopen = () => {
      this.emitConnection(true)
    }

    this.socket.onmessage = (message) => {
      let payload: RealtimeEvent
      try {
        payload = JSON.parse(message.data as string) as RealtimeEvent
      } catch {
        return
      }
      for (const handler of this.handlers) {
        handler(payload)
      }
    }

    this.socket.onclose = () => {
      this.socket = null
      this.emitConnection(false)
      if (!this.closedByUser) {
        this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay)
      }
    }

    this.socket.onerror = () => {
      this.socket?.close()
    }
  }

  disconnect() {
    this.closedByUser = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.socket?.close()
    this.socket = null
    this.emitConnection(false)
  }

  subscribe(handler: Handler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  onConnection(handler: (connected: boolean) => void) {
    this.connectionHandlers.add(handler)
    return () => this.connectionHandlers.delete(handler)
  }

  private emitConnection(connected: boolean) {
    for (const handler of this.connectionHandlers) {
      handler(connected)
    }
  }

  get isConnected() {
    return this.socket?.readyState === WebSocket.OPEN
  }
}

export const realtimeClient = new RealtimeClient()
