<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { reportsApi, type DashboardKpi } from '@/services/reports'
import { useAuthStore } from '@/stores/auth'
import { computed, onMounted, ref } from 'vue'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const kpi = ref<DashboardKpi | null>(null)
const loading = ref(false)
const error = ref('')

const stats = computed(() => {
  const k = kpi.value
  if (!k) return []
  return [
    { label: 'Total SKUs', value: k.totalSkus, color: 'bg-blue-500' },
    { label: 'Units On Hand', value: k.totalUnitsOnHand, color: 'bg-green-500' },
    { label: 'Units Available', value: k.totalUnitsAvailable, color: 'bg-teal-500' },
    { label: 'Units Reserved', value: k.totalUnitsReserved, color: 'bg-purple-500' },
    { label: 'Open Orders', value: k.openOrders, color: 'bg-yellow-500' },
    { label: 'Open POs', value: k.openPos, color: 'bg-orange-500' },
    { label: 'Open Exceptions', value: k.openExceptions, color: 'bg-red-500' },
  ]
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const rows = await reportsApi.getDashboardKpi()
    kpi.value = rows[0] ?? null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load dashboard'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>Dashboard</template>

    <div class="space-y-6">
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-2 text-lg font-semibold text-gray-800">
          Welcome back{{ user?.firstName ? `, ${user.firstName}` : '' }}!
        </h3>
        <p class="text-gray-600">
          Here's an overview of your warehouse operations
          <span v-if="kpi">for {{ kpi.warehouseCode }}</span
          >.
        </p>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="loading" class="text-gray-500">Loading...</p>
      <p v-else-if="!kpi && !error" class="text-gray-500">No warehouse data available.</p>

      <div v-if="kpi" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div v-for="stat in stats" :key="stat.label" class="rounded-lg bg-white p-6 shadow">
          <div class="flex items-center">
            <div :class="[stat.color, 'flex h-12 w-12 items-center justify-center rounded-full']">
              <span class="text-xl font-bold text-white">{{ stat.value }}</span>
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
