<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { outboundApi, type Shipment, type So, type SoLine } from '@/services/outbound'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const soId = route.params.id as string
const so = ref<So | null>(null)
const shipment = ref<Shipment | null>(null)
const loading = ref(false)
const error = ref('')
const success = ref('')

const carrier = ref('')
const trackingNumber = ref('')
const quantities = ref<Record<string, number>>({})

async function load() {
  loading.value = true
  error.value = ''
  try {
    so.value = await outboundApi.getSo(soId)
    if (so.value?.lines) {
      quantities.value = Object.fromEntries(
        so.value.lines.map((l) => [l.id, l.requestedQuantity - l.shippedQuantity]),
      )
    }
    try {
      shipment.value = await outboundApi.getShipment(soId)
    } catch {
      shipment.value = null
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load shipment data'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!so.value?.lines || so.value.lines.length === 0) {
    error.value = 'No lines to ship'
    return
  }
  error.value = ''
  success.value = ''
  const items = so.value.lines
    .map((l: SoLine) => ({
      soLineId: Number(l.id),
      quantity: quantities.value[l.id] ?? 0,
    }))
    .filter((i) => i.quantity > 0)

  if (items.length === 0) {
    error.value = 'Enter a quantity for at least one line'
    return
  }

  try {
    shipment.value = await outboundApi.shipSo(soId, {
      carrier: carrier.value || undefined,
      trackingNumber: trackingNumber.value || undefined,
      items,
    })
    success.value = `Shipped — ${shipment.value.shipmentNumber}`
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to ship'
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>Ship — {{ so?.orderNumber || `SO #${soId}` }}</template>

    <div class="space-y-6">
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

      <div v-if="shipment" class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">Shipment</h3>
        <dl class="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <dt class="text-sm text-gray-500">Shipment #</dt>
            <dd class="text-lg font-semibold text-gray-800">{{ shipment.shipmentNumber }}</dd>
          </div>
          <div>
            <dt class="text-sm text-gray-500">Carrier</dt>
            <dd class="text-lg text-gray-800">{{ shipment.carrier || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm text-gray-500">Tracking</dt>
            <dd class="text-lg text-gray-800">{{ shipment.trackingNumber || '—' }}</dd>
          </div>
          <div>
            <dt class="text-sm text-gray-500">Shipped At</dt>
            <dd class="text-lg text-gray-800">
              {{ shipment.shippedAt ? new Date(shipment.shippedAt).toLocaleString() : '—' }}
            </dd>
          </div>
        </dl>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Line</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Quantity
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="item in shipment.items" :key="item.id">
              <td class="px-4 py-3 text-gray-700">{{ item.soLineId }}</td>
              <td class="px-4 py-3 text-gray-700">{{ item.quantity }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="so && !shipment && !loading" class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">Create Shipment</h3>

        <div class="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Carrier</label>
            <input
              v-model="carrier"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="e.g. UPS"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Tracking Number</label>
            <input
              v-model="trackingNumber"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <table class="mb-6 min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Requested
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Shipped
              </th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Quantity
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="line in so.lines" :key="line.id">
              <td class="px-4 py-3 text-gray-700">{{ line.skuId }}</td>
              <td class="px-4 py-3 text-gray-700">{{ line.requestedQuantity }}</td>
              <td class="px-4 py-3 text-gray-700">{{ line.shippedQuantity }}</td>
              <td class="px-4 py-3">
                <input
                  v-model.number="quantities[line.id]"
                  type="number"
                  min="0"
                  class="w-32 rounded-md border border-gray-300 px-3 py-2"
                />
              </td>
            </tr>
            <tr v-if="!so.lines || so.lines.length === 0">
              <td colspan="4" class="px-4 py-6 text-center text-gray-500">No lines to ship</td>
            </tr>
          </tbody>
        </table>

        <button
          @click="submit"
          class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          Ship Order
        </button>
      </div>
    </div>
  </AppLayout>
</template>
