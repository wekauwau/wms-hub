<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { adminApi, type CreateUserInput, type User } from '@/services/admin'
import { onMounted, ref } from 'vue'

const users = ref<User[]>([])
const loading = ref(false)
const error = ref('')
const success = ref('')

const showForm = ref(false)
const editing = ref<User | null>(null)
const email = ref('')
const password = ref('')
const firstName = ref('')
const lastName = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    users.value = await adminApi.listUsers()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load users'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  email.value = ''
  password.value = ''
  firstName.value = ''
  lastName.value = ''
  showForm.value = true
}

function openEdit(user: User) {
  editing.value = user
  email.value = user.email
  password.value = ''
  firstName.value = user.firstName
  lastName.value = user.lastName
  showForm.value = true
}

async function submit() {
  error.value = ''
  success.value = ''
  try {
    const input: CreateUserInput = {
      email: email.value,
      password: password.value,
      firstName: firstName.value,
      lastName: lastName.value,
    }
    if (editing.value) {
      const update: Record<string, string> = {
        email: email.value,
        firstName: firstName.value,
        lastName: lastName.value,
      }
      if (password.value) update.password = password.value
      await adminApi.updateUser(editing.value.id, update)
      success.value = 'User updated'
    } else {
      await adminApi.createUser(input)
      success.value = 'User created'
    }
    showForm.value = false
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save user'
  }
}

async function remove(user: User) {
  if (!window.confirm(`Delete user ${user.email}?`)) return
  try {
    await adminApi.deleteUser(user.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete user'
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <template #header>Users</template>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <p v-else-if="success" class="text-sm text-green-600">{{ success }}</p>
        <button
          @click="openCreate"
          class="ml-auto rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          New User
        </button>
      </div>

      <div v-if="showForm" class="rounded-lg bg-white p-6 shadow">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">
          {{ editing ? `Edit ${editing.email}` : 'Create User' }}
        </h3>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              v-model="email"
              type="email"
              class="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Password{{ editing ? ' (leave blank to keep)' : '' }}
            </label>
            <input
              v-model="password"
              type="password"
              class="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">First Name</label>
            <input
              v-model="firstName"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Last Name</label>
            <input
              v-model="lastName"
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

      <div v-if="loading" class="text-gray-500">Loading...</div>

      <div v-else class="overflow-hidden rounded-lg bg-white shadow">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="user in users" :key="user.id">
              <td class="px-6 py-4 font-medium whitespace-nowrap text-gray-900">
                {{ user.firstName }} {{ user.lastName }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ user.email }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">
                {{ user.roles.length > 0 ? user.roles.join(', ') : '—' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700">{{ user.status }}</td>
              <td class="px-6 py-4 text-right whitespace-nowrap">
                <button @click="openEdit(user)" class="mr-3 text-blue-600 hover:underline">
                  Edit
                </button>
                <button @click="remove(user)" class="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-gray-500">No users found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>
