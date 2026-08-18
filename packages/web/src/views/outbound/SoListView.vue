<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { outboundApi, type So } from '@/services/outbound'
import { onMounted, ref } from 'vue'

const sos = ref<So[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    sos.value = await outboundApi.listSos()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load sales orders'
  } finally {
    loading.value = false
  }
}

async function remove(so: So) {
  if (!window.confirm(`Delete SO ${so.orderNumber}?`)) return
  try {
    await outboundApi.deleteSo(so.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete SO'
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>Sales Orders</template>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <router-link
          to="/outbound/so/new"
          class="ml-auto rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          New SO
        </router-link>
      </div>

      <div v-if="loading" class="text-gray-500">Loading...</div>

      <div v-else class="overflow-hidden rounded-lg bg-white shadow">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Order #
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Customer
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Priority
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="so in sos" :key="so.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <router-link :to="`/outbound/so/${so.id}`" class="text-blue-600 hover:underline">
                  {{ so.orderNumber }}
                </router-link>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">
                {{ so.customerName || '—' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="rounded-full px-2 py-1 text-xs font-medium"
                  :class="{
                    'bg-gray-100 text-gray-700': so.status === 'PENDING',
                    'bg-blue-100 text-blue-700': so.status === 'ALLOCATED',
                    'bg-yellow-100 text-yellow-700': so.status === 'PICKING',
                    'bg-purple-100 text-purple-700': so.status === 'PICKED',
                    'bg-indigo-100 text-indigo-700': so.status === 'PACKED',
                    'bg-green-100 text-green-700': so.status === 'SHIPPED',
                    'bg-gray-200 text-gray-600': so.status === 'DELIVERED',
                    'bg-red-100 text-red-700': so.status === 'CANCELLED',
                  }"
                >
                  {{ so.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ so.priority }}</td>
              <td class="px-6 py-4 text-right whitespace-nowrap">
                <router-link
                  :to="`/outbound/so/${so.id}/execute`"
                  class="mr-3 text-blue-600 hover:underline"
                >
                  Execute
                </router-link>
                <router-link
                  :to="`/outbound/so/${so.id}/ship`"
                  class="mr-3 text-green-600 hover:underline"
                >
                  Ship
                </router-link>
                <button @click="remove(so)" class="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
            <tr v-if="sos.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-gray-500">
                No sales orders found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>
