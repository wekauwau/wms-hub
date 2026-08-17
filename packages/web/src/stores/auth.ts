import { api } from '@/services/api'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('accessToken'))

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password })
    const data = response.data as { accessToken: string; user: User }
    token.value = data.accessToken
    user.value = data.user
    localStorage.setItem('accessToken', data.accessToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`
  }

  async function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('accessToken')
    delete api.defaults.headers.common['Authorization']
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      const response = await api.get('/auth/me')
      user.value = response.data as User
    } catch {
      await logout()
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    fetchUser,
  }
})
