import { useAuthStore } from '@/stores/auth'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('starts unauthenticated', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
  })

  it('sets token on login', async () => {
    const store = useAuthStore()
    store.token = 'fake-token'
    store.user = { id: '1', email: 'admin@wms.local', firstName: 'Admin', lastName: 'User' }
    localStorage.setItem('accessToken', 'fake-token')

    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.email).toBe('admin@wms.local')
  })

  it('clears state on logout', async () => {
    const store = useAuthStore()
    store.token = 'fake-token'
    store.user = { id: '1', email: 'admin@wms.local', firstName: 'Admin', lastName: 'User' }
    localStorage.setItem('accessToken', 'fake-token')

    store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})

describe('Router Guards', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('redirects to /login when accessing protected route without token', async () => {
    const { default: router } = await import('@/router/index.ts')
    await router.push('/dashboard')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('allows access to /login when not authenticated', async () => {
    const { default: router } = await import('@/router/index.ts')
    await router.push('/login')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('redirects to /dashboard when accessing /login with token', async () => {
    localStorage.setItem('accessToken', 'fake-token')

    const { default: router } = await import('@/router/index.ts')
    await router.push('/login')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('dashboard')
  })
})
