import { api } from '@/services/api'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

interface LoginResponse {
  accessToken: string
  user: User
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('accessToken'))

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const data = await api.post<LoginResponse>('/auth/login', { email, password })
    token.value = data.accessToken
    user.value = data.user
    localStorage.setItem('accessToken', data.accessToken)
  }

  async function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('accessToken')
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const me = await api.get<User>('/auth/me')
      user.value = me
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
