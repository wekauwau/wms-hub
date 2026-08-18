<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: 'home' },
  { label: 'Inbound', to: '/inbound', icon: 'package' },
  { label: 'Outbound', to: '/outbound', icon: 'truck' },
  { label: 'Inventory', to: '/inventory', icon: 'boxes' },
  { label: 'Workflows', to: '/workflows', icon: 'git-branch' },
  { label: 'Reports', to: '/reports/stock-summary', icon: 'chart' },
  { label: 'Admin', to: '/admin/users', icon: 'shield' },
]

async function handleLogout() {
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
        <div class="px-6 py-4">
          <h2 class="text-lg font-semibold text-gray-800">
            <slot name="header" />
          </h2>
        </div>
      </header>

      <div class="p-6">
        <slot />
      </div>
    </main>
  </div>
</template>
