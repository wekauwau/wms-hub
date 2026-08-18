import PoListView from '@/views/inbound/PoListView.vue'
import ReceiveView from '@/views/inbound/ReceiveView.vue'
import SoListView from '@/views/outbound/SoListView.vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Component } from 'vue'

const mocks = vi.hoisted(() => ({
  listPos: vi.fn(),
  deletePo: vi.fn(),
  getPo: vi.fn(),
  getReceivingSummary: vi.fn(),
  receivePo: vi.fn(),
  listSos: vi.fn(),
  deleteSo: vi.fn(),
}))

vi.mock('@/services/inbound', () => ({
  inboundApi: {
    listPos: mocks.listPos,
    getPo: mocks.getPo,
    deletePo: mocks.deletePo,
    getReceivingSummary: mocks.getReceivingSummary,
    receivePo: mocks.receivePo,
    suggestPutaway: vi.fn(),
    confirmPutaway: vi.fn(),
  },
}))

vi.mock('@/services/outbound', () => ({
  outboundApi: {
    listSos: mocks.listSos,
    deleteSo: mocks.deleteSo,
    getAllocations: vi.fn().mockResolvedValue([]),
    getPicks: vi.fn().mockResolvedValue([]),
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

describe('Inbound Views', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('PO list renders orders from the API', async () => {
    mocks.listPos.mockResolvedValue([
      { id: '1', poNumber: 'PO-100', supplierName: 'Acme', status: 'SUBMITTED' },
      { id: '2', poNumber: 'PO-200', supplierName: null, status: 'DRAFT' },
    ])
    const wrapper = mountView(PoListView)
    await flushPromises()

    expect(mocks.listPos).toHaveBeenCalled()
    expect(wrapper.text()).toContain('PO-100')
    expect(wrapper.text()).toContain('Acme')
    expect(wrapper.text()).toContain('PO-200')
  })

  it('PO list shows empty state', async () => {
    mocks.listPos.mockResolvedValue([])
    const wrapper = mountView(PoListView)
    await flushPromises()

    expect(wrapper.text()).toContain('No purchase orders found')
  })

  it('receive view shows remaining quantities', async () => {
    mocks.getPo.mockResolvedValue({ id: '1', poNumber: 'PO-100' })
    mocks.getReceivingSummary.mockResolvedValue([
      { lineId: '1', skuId: '5', expectedQuantity: 100, receivedQuantity: 40, remaining: 60 },
    ])
    const wrapper = mountView(ReceiveView)
    await flushPromises()

    expect(mocks.getReceivingSummary).toHaveBeenCalledWith('1')
    expect(wrapper.text()).toContain('60')
  })
})

describe('Outbound Views', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('SO list renders orders from the API', async () => {
    mocks.listSos.mockResolvedValue([
      { id: '1', orderNumber: 'SO-300', customerName: 'Beta', status: 'PENDING', priority: 3 },
    ])
    const wrapper = mountView(SoListView)
    await flushPromises()

    expect(mocks.listSos).toHaveBeenCalled()
    expect(wrapper.text()).toContain('SO-300')
    expect(wrapper.text()).toContain('Beta')
  })

  it('SO list shows empty state', async () => {
    mocks.listSos.mockResolvedValue([])
    const wrapper = mountView(SoListView)
    await flushPromises()

    expect(wrapper.text()).toContain('No sales orders found')
  })
})
