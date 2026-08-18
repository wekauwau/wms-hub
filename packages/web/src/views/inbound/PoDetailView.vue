<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { inboundApi, type Po } from '@/services/inbound'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const po = ref<Po | null>(null)
const loading = ref(false)
const error = ref('')

const skuId = ref<number | null>(null)
const expectedQuantity = ref<number | null>(null)
const unitCost = ref<number | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    po.value = await inboundApi.getPo(route.params.id as string)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load PO'
  } finally {
    loading.value = false
  }
}

async function addLine() {
  if (!po.value || skuId.value == null || expectedQuantity.value == null) return
  try {
    await inboundApi.addPoLine(po.value.id, {
      skuId: skuId.value,
      expectedQuantity: expectedQuantity.value,
      unitCost: unitCost.value ?? undefined,
    })
    skuId.value = null
    expectedQuantity.value = null
    unitCost.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to add line'
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>{{ po?.poNumber ?? 'Purchase Order' }}</template>

    <div class="space-y-6">
      <div class="flex gap-2">
        <router-link
          :to="`/inbound/po/${po?.id}/receive`"
          class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Receive
        </router-link>
        <router-link
          :to="`/inbound/putaway?poId=${po?.id}`"
          class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          Putaway
        </router-link>
        <button
          @click="router.back()"
          class="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="loading" class="text-gray-500">Loading...</p>

      <template v-if="po">
        <div class="rounded-lg bg-white p-6 shadow">
          <dl class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <dt class="text-sm text-gray-500">Status</dt>
              <dd class="text-lg font-semibold text-gray-800">{{ po.status }}</dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Supplier</dt>
              <dd class="text-lg text-gray-800">{{ po.supplierName || '—' }}</dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Warehouse</dt>
              <dd class="text-lg text-gray-800">{{ po.warehouseId }}</dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Expected Date</dt>
              <dd class="text-lg text-gray-800">
                {{ po.expectedDate ? po.expectedDate.slice(0, 10) : '—' }}
              </dd>
            </div>
          </dl>
          <p v-if="po.notes" class="mt-4 text-sm text-gray-600">{{ po.notes }}</p>
        </div>

        <div class="rounded-lg bg-white p-6 shadow">
          <h3 class="mb-4 text-lg font-semibold text-gray-800">Lines</h3>

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
                  Unit Cost
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="line in po.lines" :key="line.id">
                <td class="px-4 py-3 text-gray-700">{{ line.skuId }}</td>
                <td class="px-4 py-3 text-gray-700">{{ line.expectedQuantity }}</td>
                <td class="px-4 py-3 text-gray-700">{{ line.receivedQuantity }}</td>
                <td class="px-4 py-3 text-gray-700">{{ line.unitCost ?? '—' }}</td>
              </tr>
              <tr v-if="!po.lines || po.lines.length === 0">
                <td colspan="4" class="px-4 py-6 text-center text-gray-500">No lines yet</td>
              </tr>
            </tbody>
          </table>

          <div class="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
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
                v-model.number="expectedQuantity"
                type="number"
                min="0"
                class="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Unit Cost</label>
              <input
                v-model.number="unitCost"
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <button
              @click="addLine"
              class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Add Line
            </button>
          </div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>
