<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { inboundApi, type PutawaySuggestion } from '@/services/inbound'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const warehouseId = ref<number | null>(null)
const skuId = ref<number | null>(null)
const quantity = ref<number | null>(null)
const suggestions = ref<PutawaySuggestion[]>([])
const selectedLocationId = ref<number | null>(null)
const loading = ref(false)
const error = ref('')
const success = ref('')

const poId = route.query.poId ? Number(route.query.poId) : undefined

async function search() {
  if (!warehouseId.value || !skuId.value || !quantity.value) {
    error.value = 'Warehouse, SKU and quantity are required'
    return
  }
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    suggestions.value = await inboundApi.suggestPutaway({
      warehouseId: warehouseId.value,
      skuId: skuId.value,
      quantity: quantity.value,
    })
    if (suggestions.value.length === 0) error.value = 'No suitable locations found'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to get suggestions'
  } finally {
    loading.value = false
  }
}

async function confirm() {
  if (!skuId.value || !selectedLocationId.value || !quantity.value) {
    error.value = 'Select a location first'
    return
  }
  error.value = ''
  success.value = ''
  try {
    const result = await inboundApi.confirmPutaway({
      skuId: skuId.value,
      locationId: selectedLocationId.value,
      quantity: quantity.value,
      poId,
    })
    success.value = `Putaway complete — movement ${result.movementId}`
    suggestions.value = []
    selectedLocationId.value = null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to confirm putaway'
  }
}
</script>

<template>
  <AppLayout>
    <template #header>Putaway</template>

    <div class="space-y-4">
      <div class="flex gap-2">
        <button
          @click="router.back()"
          class="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="success" class="text-sm text-green-600">{{ success }}</p>

      <div class="rounded-lg bg-white p-6 shadow">
        <div class="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Warehouse ID</label>
            <input
              v-model.number="warehouseId"
              type="number"
              min="1"
              class="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">SKU ID</label>
            <input
              v-model.number="skuId"
              type="number"
              min="1"
              class="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
            <input
              v-model.number="quantity"
              type="number"
              min="1"
              class="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <button
            @click="search"
            class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Find Locations
          </button>
        </div>
      </div>

      <div v-if="suggestions.length > 0" class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">Suggested Locations</h3>
        <table class="mb-4 min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                On Hand
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Capacity
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Available
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Select
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="s in suggestions" :key="s.locationId">
              <td class="px-4 py-3 text-gray-700">{{ s.locationCode }}</td>
              <td class="px-4 py-3 text-gray-700">{{ s.locationName }}</td>
              <td class="px-4 py-3 text-gray-700">{{ s.currentQuantity }}</td>
              <td class="px-4 py-3 text-gray-700">{{ s.capacity ?? '—' }}</td>
              <td class="px-4 py-3 text-gray-700">{{ s.availableCapacity ?? '—' }}</td>
              <td class="px-4 py-3">
                <input
                  type="radio"
                  name="location"
                  :value="Number(s.locationId)"
                  v-model="selectedLocationId"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <button
          @click="confirm"
          class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          Confirm Putaway
        </button>
      </div>
    </div>
  </AppLayout>
</template>
