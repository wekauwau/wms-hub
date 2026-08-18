<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { reportsApi, type StockSummary } from '@/services/reports'
import { onMounted, ref } from 'vue'

const rows = ref<StockSummary[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await reportsApi.getStockSummary()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load stock summary'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>Stock Summary</template>

    <div class="space-y-4">
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="loading" class="text-gray-500">Loading...</p>

      <div v-else class="overflow-hidden rounded-lg bg-white shadow">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Warehouse
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                On Hand
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Reserved
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Available
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Locations
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="row in rows" :key="`${row.skuId}-${row.warehouseId}`">
              <td class="px-6 py-4 font-medium whitespace-nowrap text-gray-900">
                {{ row.skuCode }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ row.skuName }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ row.warehouseCode }}</td>
              <td class="px-6 py-4 text-right whitespace-nowrap text-gray-700">
                {{ row.totalOnHand }}
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap text-gray-700">
                {{ row.totalReserved }}
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap text-gray-700">
                {{ row.totalAvailable }}
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap text-gray-700">
                {{ row.locationCount }}
              </td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="7" class="px-6 py-10 text-center text-gray-500">No stock data found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>
