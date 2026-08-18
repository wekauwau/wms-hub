import RolesView from '@/views/admin/RolesView.vue'
import UsersView from '@/views/admin/UsersView.vue'
import DashboardView from '@/views/DashboardView.vue'
import LocationUsageView from '@/views/reports/LocationUsageView.vue'
import StockSummaryView from '@/views/reports/StockSummaryView.vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Component } from 'vue'

const mocks = vi.hoisted(() => ({
  getDashboardKpi: vi.fn(),
  getStockSummary: vi.fn(),
  getLocationUsage: vi.fn(),
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  listRoles: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  listPermissions: vi.fn(),
  assignPermissions: vi.fn(),
}))

vi.mock('@/services/reports', () => ({
  reportsApi: {
    getDashboardKpi: mocks.getDashboardKpi,
    getStockSummary: mocks.getStockSummary,
    getLocationUsage: mocks.getLocationUsage,
  },
}))

vi.mock('@/services/admin', () => ({
  adminApi: {
    listUsers: mocks.listUsers,
    createUser: mocks.createUser,
    updateUser: mocks.updateUser,
    deleteUser: mocks.deleteUser,
    listRoles: mocks.listRoles,
    createRole: mocks.createRole,
    updateRole: mocks.updateRole,
    deleteRole: mocks.deleteRole,
    listPermissions: mocks.listPermissions,
    assignPermissions: mocks.assignPermissions,
  },
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRoute: () => ({ params: { id: '1' }, query: {} }),
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  }
})

vi.mock('@/components/AppLayout.vue', () => ({
  default: {
    name: 'AppLayout',
    template: '<div class="app-layout"><slot name="header" /><slot /></div>',
  },
}))

const mountView = (component: Component) =>
  mount(component, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })

describe('Dashboard + Reports Views', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('dashboard renders KPIs from the reports API', async () => {
    mocks.getDashboardKpi.mockResolvedValue([
      {
        warehouseId: '1',
        warehouseCode: 'WH1',
        totalSkus: 42,
        totalUnitsOnHand: 1200,
        totalUnitsReserved: 300,
        totalUnitsAvailable: 900,
        openOrders: 5,
        openPos: 2,
        openExceptions: 1,
      },
    ])
    const wrapper = mountView(DashboardView)
    await flushPromises()

    expect(mocks.getDashboardKpi).toHaveBeenCalled()
    expect(wrapper.text()).toContain('WH1')
    expect(wrapper.text()).toContain('1200')
    expect(wrapper.text()).toContain('Open Orders')
  })

  it('stock summary renders rows from the reports API', async () => {
    mocks.getStockSummary.mockResolvedValue([
      {
        skuId: '1',
        skuCode: 'SKU-1',
        skuName: 'Widget',
        warehouseId: '1',
        warehouseCode: 'WH1',
        totalOnHand: 100,
        totalReserved: 20,
        totalAvailable: 80,
        locationCount: 3,
      },
    ])
    const wrapper = mountView(StockSummaryView)
    await flushPromises()

    expect(mocks.getStockSummary).toHaveBeenCalled()
    expect(wrapper.text()).toContain('SKU-1')
    expect(wrapper.text()).toContain('Widget')
    expect(wrapper.text()).toContain('80')
  })

  it('location usage renders utilization from the reports API', async () => {
    mocks.getLocationUsage.mockResolvedValue([
      {
        locationId: '1',
        locationCode: 'A-01',
        locationType: 'BIN',
        capacity: 100,
        capacityUnit: 'units',
        currentUnits: 75,
        utilizationPct: 75,
      },
    ])
    const wrapper = mountView(LocationUsageView)
    await flushPromises()

    expect(mocks.getLocationUsage).toHaveBeenCalled()
    expect(wrapper.text()).toContain('A-01')
    expect(wrapper.text()).toContain('75%')
  })
})

describe('Admin Views', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('users view renders users from the API', async () => {
    mocks.listUsers.mockResolvedValue([
      {
        id: '1',
        email: 'admin@wms.local',
        firstName: 'Admin',
        lastName: 'User',
        status: 'ACTIVE',
        roles: ['admin'],
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])
    const wrapper = mountView(UsersView)
    await flushPromises()

    expect(mocks.listUsers).toHaveBeenCalled()
    expect(wrapper.text()).toContain('admin@wms.local')
    expect(wrapper.text()).toContain('ACTIVE')
  })

  it('roles view renders roles and permissions from the API', async () => {
    mocks.listRoles.mockResolvedValue([
      {
        id: '1',
        name: 'admin',
        description: 'Full access',
        permissions: [{ id: '1', name: 'inventory.read' }],
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])
    mocks.listPermissions.mockResolvedValue([
      { id: '1', name: 'inventory.read', description: null },
      { id: '2', name: 'inventory.write', description: null },
    ])
    const wrapper = mountView(RolesView)
    await flushPromises()

    expect(mocks.listRoles).toHaveBeenCalled()
    expect(mocks.listPermissions).toHaveBeenCalled()
    expect(wrapper.text()).toContain('admin')
    expect(wrapper.text()).toContain('inventory.read')
  })
})
