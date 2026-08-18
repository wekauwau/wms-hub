<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import {
  outboundApi,
  type AllocationResult,
  type PickTask,
  type ReservationInfo,
  type So,
  type SoLine,
} from '@/services/outbound'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const soId = route.params.id as string
const so = ref<So | null>(null)
const allocations = ref<ReservationInfo[]>([])
const picks = ref<PickTask[]>([])
const loading = ref(false)
const error = ref('')
const success = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    so.value = await outboundApi.getSo(soId)
    allocations.value = await outboundApi.getAllocations(soId)
    picks.value = await outboundApi.getPicks(soId)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load SO execution data'
  } finally {
    loading.value = false
  }
}

async function allocateAll() {
  if (!so.value?.lines || so.value.lines.length === 0) {
    error.value = 'No lines to allocate'
    return
  }
  error.value = ''
  success.value = ''
  const lines = so.value.lines
    .filter((l) => l.allocatedQuantity < l.requestedQuantity)
    .map((l) => ({ lineId: Number(l.id), quantity: l.requestedQuantity - l.allocatedQuantity }))

  if (lines.length === 0) {
    error.value = 'All lines already fully allocated'
    return
  }

  try {
    const res = await outboundApi.allocateSo(soId, lines)
    const allocated = res.allocated as AllocationResult[]
    success.value = `Allocated ${allocated.length} line(s)`
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to allocate'
  }
}

async function createPick(line: SoLine) {
  error.value = ''
  success.value = ''
  try {
    await outboundApi.createPicks(soId, [
      {
        soLineId: Number(line.id),
        locationId: Number(allocations.value[0]?.locationId ?? 0),
        expectedQuantity: line.requestedQuantity,
      },
    ])
    success.value = `Pick task created for line ${line.id}`
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create pick'
  }
}

async function completePickTask(pick: PickTask) {
  error.value = ''
  success.value = ''
  try {
    await outboundApi.completePick(soId, pick.id, pick.expectedQuantity)
    success.value = `Pick ${pick.id} completed`
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to complete pick'
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>Execute — {{ so?.orderNumber || `SO #${soId}` }}</template>

    <div class="space-y-6">
      <div class="flex gap-2">
        <button
          @click="router.back()"
          class="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          @click="allocateAll"
          class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Allocate Remaining
        </button>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="success" class="text-sm text-green-600">{{ success }}</p>
      <p v-if="loading" class="text-gray-500">Loading...</p>

      <div v-if="so && !loading" class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">Lines</h3>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Requested
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Allocated
              </th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pick</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="line in so.lines" :key="line.id">
              <td class="px-4 py-3 text-gray-700">{{ line.skuId }}</td>
              <td class="px-4 py-3 text-gray-700">{{ line.requestedQuantity }}</td>
              <td class="px-4 py-3 text-gray-700">{{ line.allocatedQuantity }}</td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="line.allocatedQuantity > 0"
                  @click="createPick(line)"
                  class="text-blue-600 hover:underline"
                >
                  Create Pick
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="allocations.length > 0" class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">Allocations</h3>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Location
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Quantity
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="a in allocations" :key="a.id">
              <td class="px-4 py-3 text-gray-700">{{ a.skuId }}</td>
              <td class="px-4 py-3 text-gray-700">{{ a.locationId }}</td>
              <td class="px-4 py-3 text-gray-700">{{ a.quantity }}</td>
              <td class="px-4 py-3 text-gray-700">{{ a.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="picks.length > 0" class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">Pick Tasks</h3>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Expected
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="pick in picks" :key="pick.id">
              <td class="px-4 py-3 text-gray-700">{{ pick.skuId }}</td>
              <td class="px-4 py-3 text-gray-700">{{ pick.expectedQuantity }}</td>
              <td class="px-4 py-3 text-gray-700">{{ pick.status }}</td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="pick.status === 'PENDING' || pick.status === 'IN_PROGRESS'"
                  @click="completePickTask(pick)"
                  class="text-green-600 hover:underline"
                >
                  Complete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>
