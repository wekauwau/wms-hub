import { useRealtimeStore } from '@/stores/realtime'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  subscribe: vi.fn(),
  onConnection: vi.fn(),
  isConnected: false,
}))

vi.mock('@/services/realtime', () => ({
  realtimeClient: {
    connect: mocks.connect,
    disconnect: mocks.disconnect,
    subscribe: mocks.subscribe,
    onConnection: mocks.onConnection,
    get isConnected() {
      return mocks.isConnected
    },
  },
}))

describe('Realtime Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('connects and subscribes to events', () => {
    const store = useRealtimeStore()
    store.connect()

    expect(mocks.onConnection).toHaveBeenCalled()
    expect(mocks.subscribe).toHaveBeenCalled()
    expect(mocks.connect).toHaveBeenCalled()
  })

  it('tracks connection state via callback', () => {
    const store = useRealtimeStore()

    store.connect()
    const handler = mocks.onConnection.mock.calls[0]?.[0]

    expect(store.connected).toBe(false)

    handler(true)
    expect(store.connected).toBe(true)

    handler(false)
    expect(store.connected).toBe(false)
  })

  it('adds notifications and counts unread', () => {
    const store = useRealtimeStore()

    store.connect()
    const subscriber = mocks.subscribe.mock.calls[0]?.[0]

    subscriber({
      type: 'order.shipped',
      data: { soId: '1', shipmentId: '2', shipmentNumber: 'SHP-1' },
    })
    subscriber({ type: 'pick.completed', data: { pickId: '3', soId: '1' } })

    expect(store.notifications).toHaveLength(2)
    expect(store.unreadCount).toBe(2)
  })

  it('marks all notifications as read', () => {
    const store = useRealtimeStore()

    store.connect()
    const subscriber = mocks.subscribe.mock.calls[0]?.[0]

    subscriber({ type: 'po.received', data: { poId: '1' } })
    subscriber({
      type: 'putaway.confirmed',
      data: { movementId: '1', skuId: '2', locationId: '3' },
    })

    store.markAllRead()

    expect(store.unreadCount).toBe(0)
    expect(store.notifications.every((n) => n.read)).toBe(true)
  })

  it('clears notifications', () => {
    const store = useRealtimeStore()

    store.connect()
    const subscriber = mocks.subscribe.mock.calls[0]?.[0]

    subscriber({ type: 'transfer.completed', data: { transferId: '1', skuId: '2' } })

    store.clearNotifications()

    expect(store.notifications).toHaveLength(0)
    expect(store.unreadCount).toBe(0)
  })

  it('disconnects and resets connection state', () => {
    const store = useRealtimeStore()

    store.connect()
    const handler = mocks.onConnection.mock.calls[0]?.[0]

    handler(true)

    store.disconnect()

    expect(mocks.disconnect).toHaveBeenCalled()
    expect(store.connected).toBe(false)
  })

  it('maps event types to human labels', () => {
    const store = useRealtimeStore()

    expect(
      store.labelFor({ type: 'cycle-count.reconciled', data: { cycleCountId: '1', variances: 2 } }),
    ).toBe('Cycle count reconciled')
    expect(
      store.labelFor({ type: 'adjustment.approved', data: { adjustmentId: '1', skuId: '2' } }),
    ).toBe('Adjustment approved')
  })
})
