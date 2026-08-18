<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { inboundApi, type ReceivingSummaryItem } from '@/services/inbound'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const poId = route.params.id as string
const poNumber = ref('')
const items = ref<ReceivingSummaryItem[]>([])
const quantities = ref<Record<string, number>>({})
const loading = ref(false)
const error = ref('')
const success = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const po = await inboundApi.getPo(poId)
    poNumber.value = po.poNumber
    items.value = await inboundApi.getReceivingSummary(poId)
    quantities.value = Object.fromEntries(items.value.map((i) => [i.lineId, 0]))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load receiving summary'
  } finally {
    loading.value = false
  }
}

async function submit() {
  error.value = ''
  success.value = ''
  const lines = items.value
    .map((i) => ({ lineId: Number(i.lineId), receivedQuantity: quantities.value[i.lineId] ?? 0 }))
    .filter((l) => l.receivedQuantity > 0)

  if (lines.length === 0) {
    error.value = 'Enter a quantity for at least one line'
    return
  }

  try {
    await inboundApi.receivePo(poId, lines)
    success.value = 'Receipt recorded'
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to receive'
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>Receive — {{ poNumber || `PO #${poId}` }}</template>

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
      <p v-if="loading" class="text-gray-500">Loading...</p>

      <div v-if="!loading" class="rounded-lg bg-white p-6 shadow">
        <table class="mb-6 min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Expected
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Received
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Remaining
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Quantity
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="item in items" :key="item.lineId">
              <td class="px-4 py-3 text-gray-700">{{ item.skuId }}</td>
              <td class="px-4 py-3 text-gray-700">{{ item.expectedQuantity }}</td>
              <td class="px-4 py-3 text-gray-700">{{ item.receivedQuantity }}</td>
              <td class="px-4 py-3 text-gray-700">{{ item.remaining }}</td>
              <td class="px-4 py-3">
                <input
                  v-model.number="quantities[item.lineId]"
                  type="number"
                  min="0"
                  :max="item.remaining"
                  class="w-32 rounded-md border border-gray-300 px-3 py-2"
                />
              </td>
            </tr>
            <tr v-if="items.length === 0">
              <td colspan="5" class="px-4 py-6 text-center text-gray-500">No lines to receive</td>
            </tr>
          </tbody>
        </table>

        <button
          @click="submit"
          class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Record Receipt
        </button>
      </div>
    </div>
  </AppLayout>
</template>
