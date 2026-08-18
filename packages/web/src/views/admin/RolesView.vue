<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { adminApi, type Permission, type Role } from '@/services/admin'
import { onMounted, ref } from 'vue'

const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const loading = ref(false)
const error = ref('')
const success = ref('')

const showForm = ref(false)
const showPermissions = ref(false)
const editing = ref<Role | null>(null)
const name = ref('')
const description = ref('')
const selectedPermissionIds = ref<string[]>([])
const permissionRoleId = ref<Role | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [roleRows, permRows] = await Promise.all([
      adminApi.listRoles(),
      adminApi.listPermissions(),
    ])
    roles.value = roleRows
    permissions.value = permRows
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load roles'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  name.value = ''
  description.value = ''
  showForm.value = true
}

function openEdit(role: Role) {
  editing.value = role
  name.value = role.name
  description.value = role.description ?? ''
  showForm.value = true
}

async function submit() {
  error.value = ''
  success.value = ''
  try {
    if (editing.value) {
      await adminApi.updateRole(editing.value.id, {
        name: name.value,
        description: description.value,
      })
      success.value = 'Role updated'
    } else {
      await adminApi.createRole({ name: name.value, description: description.value })
      success.value = 'Role created'
    }
    showForm.value = false
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save role'
  }
}

async function remove(role: Role) {
  if (!window.confirm(`Delete role ${role.name}?`)) return
  try {
    await adminApi.deleteRole(role.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete role'
  }
}

function openPermissions(role: Role) {
  permissionRoleId.value = role
  selectedPermissionIds.value = role.permissions.map((p) => p.id)
  showPermissions.value = true
}

async function submitPermissions() {
  if (!permissionRoleId.value) return
  error.value = ''
  success.value = ''
  try {
    await adminApi.assignPermissions(permissionRoleId.value.id, selectedPermissionIds.value)
    success.value = 'Permissions updated'
    showPermissions.value = false
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to update permissions'
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>Roles</template>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <p v-else-if="success" class="text-sm text-green-600">{{ success }}</p>
        <button
          @click="openCreate"
          class="ml-auto rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          New Role
        </button>
      </div>

      <div v-if="showForm" class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">
          {{ editing ? `Edit ${editing.name}` : 'Create Role' }}
        </h3>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              v-model="name"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <input
              v-model="description"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          <button
            @click="submit"
            class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Save
          </button>
          <button
            @click="showForm = false"
            class="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>

      <div v-if="showPermissions" class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">
          Permissions for {{ permissionRoleId?.name }}
        </h3>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
          <label
            v-for="perm in permissions"
            :key="perm.id"
            class="flex items-center gap-2 text-sm text-gray-700"
          >
            <input v-model="selectedPermissionIds" type="checkbox" :value="perm.id" />
            {{ perm.name }}
          </label>
        </div>
        <div class="mt-4 flex gap-2">
          <button
            @click="submitPermissions"
            class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Save
          </button>
          <button
            @click="showPermissions = false"
            class="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-gray-500">Loading...</div>

      <div v-else class="overflow-hidden rounded-lg bg-white shadow">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Permissions
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="role in roles" :key="role.id">
              <td class="px-6 py-4 font-medium whitespace-nowrap text-gray-900">{{ role.name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">
                {{ role.description || '—' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">
                {{
                  role.permissions.length > 0 ? role.permissions.map((p) => p.name).join(', ') : '—'
                }}
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap">
                <button @click="openPermissions(role)" class="mr-3 text-blue-600 hover:underline">
                  Permissions
                </button>
                <button @click="openEdit(role)" class="mr-3 text-blue-600 hover:underline">
                  Edit
                </button>
                <button @click="remove(role)" class="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
            <tr v-if="roles.length === 0">
              <td colspan="4" class="px-6 py-10 text-center text-gray-500">No roles found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>
