<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { outboundApi, type So } from '@/services/outbound'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const so = ref<So | null>(null)
const loading = ref(false)
const error = ref('')

const skuId = ref<number | null>(null)
const requestedQuantity = ref<number | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    so.value = await outboundApi.getSo(route.params.id as string)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load SO'
  } finally {
    loading.value = false
  }
}

async function addLine() {
  if (!so.value || skuId.value == null || requestedQuantity.value == null) return
  try {
    await outboundApi.addSoLine(so.value.id, {
      skuId: skuId.value,
      requestedQuantity: requestedQuantity.value,
    })
    skuId.value = null
    requestedQuantity.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to add line'
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>{{ so?.orderNumber ?? 'Sales Order' }}</template>

    <div class="space-y-6">
      <div class="flex gap-2">
        <router-link
          :to="`/outbound/so/${so?.id}/execute`"
          class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Execute
        </router-link>
        <router-link
          :to="`/outbound/so/${so?.id}/ship`"
          class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          Ship
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

      <template v-if="so">
        <div class="rounded-lg bg-white p-6 shadow">
          <dl class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <dt class="text-sm text-gray-500">Status</dt>
              <dd class="text-lg font-semibold text-gray-800">{{ so.status }}</dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Customer</dt>
              <dd class="text-lg text-gray-800">{{ so.customerName || '—' }}</dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Warehouse</dt>
              <dd class="text-lg text-gray-800">{{ so.warehouseId }}</dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Priority</dt>
              <dd class="text-lg text-gray-800">{{ so.priority }}</dd>
            </div>
          </dl>
          <p v-if="so.notes" class="mt-4 text-sm text-gray-600">{{ so.notes }}</p>
        </div>

        <div class="rounded-lg bg-white p-6 shadow">
          <h3 class="mb-4 text-lg font-semibold text-gray-800">Lines</h3>

          <table class="mb-6 min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Requested
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Allocated
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Picked
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Shipped
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="line in so.lines" :key="line.id">
                <td class="px-4 py-3 text-gray-700">{{ line.skuId }}</td>
                <td class="px-4 py-3 text-gray-700">{{ line.requestedQuantity }}</td>
                <td class="px-4 py-3 text-gray-700">{{ line.allocatedQuantity }}</td>
                <td class="px-4 py-3 text-gray-700">{{ line.pickedQuantity }}</td>
                <td class="px-4 py-3 text-gray-700">{{ line.shippedQuantity }}</td>
              </tr>
              <tr v-if="!so.lines || so.lines.length === 0">
                <td colspan="5" class="px-4 py-6 text-center text-gray-500">No lines yet</td>
              </tr>
            </tbody>
          </table>

          <div class="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
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
                v-model.number="requestedQuantity"
                type="number"
                min="0"
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
