<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { inboundApi, type Po } from '@/services/inbound'
import { onMounted, ref } from 'vue'

const pos = ref<Po[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    pos.value = await inboundApi.listPos()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load purchase orders'
  } finally {
    loading.value = false
  }
}

async function remove(po: Po) {
  if (!window.confirm(`Delete PO ${po.poNumber}?`)) return
  try {
    await inboundApi.deletePo(po.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete PO'
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>Purchase Orders</template>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <router-link
          to="/inbound/po/new"
          class="ml-auto rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          New PO
        </router-link>
      </div>

      <div v-if="loading" class="text-gray-500">Loading...</div>

      <div v-else class="overflow-hidden rounded-lg bg-white shadow">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO #</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Supplier
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Expected
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="po in pos" :key="po.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <router-link :to="`/inbound/po/${po.id}`" class="text-blue-600 hover:underline">
                  {{ po.poNumber }}
                </router-link>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">
                {{ po.supplierName || '—' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="rounded-full px-2 py-1 text-xs font-medium"
                  :class="{
                    'bg-gray-100 text-gray-700': po.status === 'DRAFT',
                    'bg-blue-100 text-blue-700': po.status === 'SUBMITTED',
                    'bg-yellow-100 text-yellow-700': po.status === 'PARTIALLY_RECEIVED',
                    'bg-green-100 text-green-700': po.status === 'RECEIVED',
                    'bg-red-100 text-red-700': po.status === 'CANCELLED',
                    'bg-gray-200 text-gray-600': po.status === 'CLOSED',
                  }"
                >
                  {{ po.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">
                {{ po.expectedDate ? po.expectedDate.slice(0, 10) : '—' }}
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap">
                <router-link
                  :to="`/inbound/po/${po.id}/receive`"
                  class="mr-3 text-blue-600 hover:underline"
                >
                  Receive
                </router-link>
                <button @click="remove(po)" class="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
            <tr v-if="pos.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-gray-500">
                No purchase orders found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>
