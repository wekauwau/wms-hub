<script setup lang="ts">
import { Bell } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useRealtimeStore } from '@/stores/realtime'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const realtimeStore = useRealtimeStore()
const router = useRouter()

const user = computed(() => authStore.user)
const showNotifications = ref(false)

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: 'home' },
  { label: 'Inbound', to: '/inbound', icon: 'package' },
  { label: 'Outbound', to: '/outbound', icon: 'truck' },
  { label: 'Inventory', to: '/inventory', icon: 'boxes' },
  { label: 'Workflows', to: '/workflows', icon: 'git-branch' },
  { label: 'Reports', to: '/reports/stock-summary', icon: 'chart' },
  { label: 'Admin', to: '/admin/users', icon: 'shield' },
]

onMounted(() => {
  realtimeStore.connect()
})

async function handleLogout() {
  realtimeStore.disconnect()
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex h-screen bg-gray-100">
    <aside class="flex w-64 flex-col bg-white shadow-md">
      <div class="border-b p-4">
        <h1 class="text-xl font-bold text-gray-800">WMS Hub</h1>
        <p class="text-xs text-gray-500">Warehouse Management</p>
      </div>

      <nav class="flex-1 space-y-1 p-4">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          active-class="bg-gray-100 text-gray-900"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <div class="border-t p-4">
        <div class="flex items-center justify-between">
          <span class="truncate text-sm text-gray-600">{{ user?.email }}</span>
          <button @click="handleLogout" class="text-sm text-red-600 hover:text-red-800">
            Logout
          </button>
        </div>
      </div>
    </aside>

    <main class="flex-1 overflow-auto">
      <header class="bg-white shadow-sm">
        <div class="flex items-center justify-between px-6 py-4">
          <h2 class="text-lg font-semibold text-gray-800">
            <slot name="header" />
          </h2>

          <div class="relative">
            <button
              @click="showNotifications = !showNotifications"
              class="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Notifications"
            >
              <Bell :size="20" />
              <span
                v-if="realtimeStore.unreadCount > 0"
                class="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white"
              >
                {{ realtimeStore.unreadCount }}
              </span>
            </button>

            <div
              v-if="showNotifications"
              class="absolute right-0 z-20 mt-2 w-80 rounded-lg bg-white shadow-lg ring-1 ring-black/5"
            >
              <div class="flex items-center justify-between border-b px-4 py-2">
                <span class="text-sm font-semibold text-gray-800">Notifications</span>
                <span class="text-xs text-gray-500">
                  {{ realtimeStore.connected ? 'Connected' : 'Disconnected' }}
                </span>
              </div>

              <div class="max-h-64 overflow-auto">
                <div
                  v-if="realtimeStore.notifications.length === 0"
                  class="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No notifications yet
                </div>
                <button
                  v-for="notification in realtimeStore.notifications"
                  :key="notification.id"
                  class="block w-full border-b px-4 py-3 text-left hover:bg-gray-50"
                  :class="{ 'bg-blue-50': !notification.read }"
                >
                  <p class="text-sm font-medium text-gray-800">
                    {{ realtimeStore.labelFor(notification.event) }}
                  </p>
                  <p class="mt-0.5 text-xs text-gray-500">
                    {{ notification.event.type }} ·
                    {{ new Date(notification.receivedAt).toLocaleTimeString() }}
                  </p>
                </button>
              </div>

              <div class="flex justify-end gap-3 border-t px-4 py-2">
                <button
                  @click="realtimeStore.markAllRead()"
                  class="text-xs text-blue-600 hover:underline"
                >
                  Mark all read
                </button>
                <button
                  @click="realtimeStore.clearNotifications()"
                  class="text-xs text-gray-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="p-6">
        <slot />
      </div>
    </main>
  </div>
</template>
