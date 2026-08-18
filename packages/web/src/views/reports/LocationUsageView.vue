<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { reportsApi, type LocationUsage } from '@/services/reports'
import { onMounted, ref } from 'vue'

const rows = ref<LocationUsage[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await reportsApi.getLocationUsage()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load location usage'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>Location Usage</template>

    <div class="space-y-4">
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="loading" class="text-gray-500">Loading...</p>

      <div v-else class="overflow-hidden rounded-lg bg-white shadow">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Location
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Capacity
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Current Units
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Utilization
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="row in rows" :key="row.locationId">
              <td class="px-6 py-4 font-medium whitespace-nowrap text-gray-900">
                {{ row.locationCode }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ row.locationType }}</td>
              <td class="px-6 py-4 text-right whitespace-nowrap text-gray-700">
                {{ row.capacity === null ? '—' : `${row.capacity} ${row.capacityUnit ?? ''}` }}
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap text-gray-700">
                {{ row.currentUnits }}
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap">
                <span v-if="row.utilizationPct === null" class="text-gray-400">—</span>
                <span
                  v-else
                  class="rounded-full px-2 py-1 text-xs font-medium"
                  :class="{
                    'bg-green-100 text-green-700': row.utilizationPct < 70,
                    'bg-yellow-100 text-yellow-700':
                      row.utilizationPct >= 70 && row.utilizationPct < 90,
                    'bg-red-100 text-red-700': row.utilizationPct >= 90,
                  }"
                >
                  {{ row.utilizationPct }}%
                </span>
              </td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-gray-500">
                No location data found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>
