<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const stats = [
  { label: 'Purchase Orders', value: '—', color: 'bg-blue-500' },
  { label: 'Sales Orders', value: '—', color: 'bg-green-500' },
  { label: 'Pending Picks', value: '—', color: 'bg-yellow-500' },
  { label: 'Low Stock Items', value: '—', color: 'bg-red-500' },
]
</script>

<template>
  <AppLayout>
    <template #header>Dashboard</template>

    <div class="space-y-6">
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-2 text-lg font-semibold text-gray-800">
          Welcome back{{ user?.firstName ? `, ${user.firstName}` : '' }}!
        </h3>
        <p class="text-gray-600">Here's an overview of your warehouse operations.</p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div v-for="stat in stats" :key="stat.label" class="rounded-lg bg-white p-6 shadow">
          <div class="flex items-center">
            <div :class="[stat.color, 'flex h-12 w-12 items-center justify-center rounded-full']">
              <span class="text-xl font-bold text-white">{{ stat.value.charAt(0) }}</span>
            </div>
            <div class="ml-4">
              <p class="text-sm text-gray-500">{{ stat.label }}</p>
              <p class="text-2xl font-bold text-gray-800">{{ stat.value }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">Quick Actions</h3>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <router-link
            to="/inbound/po"
            class="block rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
          >
            <span class="font-medium text-gray-800">Create PO</span>
          </router-link>
          <router-link
            to="/outbound/so"
            class="block rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
          >
            <span class="font-medium text-gray-800">Create SO</span>
          </router-link>
          <router-link
            to="/workflows/cycle-counts"
            class="block rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
          >
            <span class="font-medium text-gray-800">Cycle Count</span>
          </router-link>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
