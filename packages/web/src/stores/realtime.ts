import { realtimeClient, type RealtimeEvent } from '@/services/realtime'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

interface Notification {
  id: string
  event: RealtimeEvent
  receivedAt: string
  read: boolean
}

export const useRealtimeStore = defineStore('realtime', () => {
  const connected = ref(false)
  const notifications = ref<Notification[]>([])

  const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

  const eventLabels: Record<string, string> = {
    'stock.moved': 'Stock moved',
    'po.received': 'PO received',
    'putaway.confirmed': 'Putaway confirmed',
    'pick.completed': 'Pick completed',
    'order.shipped': 'Order shipped',
    'cycle-count.reconciled': 'Cycle count reconciled',
    'adjustment.approved': 'Adjustment approved',
    'transfer.completed': 'Transfer completed',
  }

  function addNotification(event: RealtimeEvent) {
    const notification: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      event,
      receivedAt: new Date().toISOString(),
      read: false,
    }
    notifications.value = [notification, ...notifications.value].slice(0, 50)
  }

  function markAllRead() {
    notifications.value = notifications.value.map((n) => ({ ...n, read: true }))
  }

  function clearNotifications() {
    notifications.value = []
  }

  function connect() {
    realtimeClient.onConnection((isConnected) => {
      connected.value = isConnected
    })
    realtimeClient.subscribe((event) => {
      addNotification(event)
    })
    connected.value = realtimeClient.isConnected
    realtimeClient.connect()
  }

  function disconnect() {
    realtimeClient.disconnect()
    connected.value = false
  }

  function labelFor(event: RealtimeEvent) {
    return eventLabels[event.type] ?? event.type
  }

  return {
    connected,
    notifications,
    unreadCount,
    connect,
    disconnect,
    markAllRead,
    clearNotifications,
    labelFor,
  }
})
