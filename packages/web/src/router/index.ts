import DashboardView from '@/views/DashboardView.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RolesView from '@/views/admin/RolesView.vue'
import UsersView from '@/views/admin/UsersView.vue'
import PoDetailView from '@/views/inbound/PoDetailView.vue'
import PoListView from '@/views/inbound/PoListView.vue'
import PutawayView from '@/views/inbound/PutawayView.vue'
import ReceiveView from '@/views/inbound/ReceiveView.vue'
import ShipView from '@/views/outbound/ShipView.vue'
import SoDetailView from '@/views/outbound/SoDetailView.vue'
import SoExecuteView from '@/views/outbound/SoExecuteView.vue'
import SoListView from '@/views/outbound/SoListView.vue'
import LocationUsageView from '@/views/reports/LocationUsageView.vue'
import StockSummaryView from '@/views/reports/StockSummaryView.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresGuest: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/inbound/po',
      name: 'po-list',
      component: PoListView,
      meta: { requiresAuth: true },
    },
    {
      path: '/inbound/po/:id',
      name: 'po-detail',
      component: PoDetailView,
      meta: { requiresAuth: true },
    },
    {
      path: '/inbound/po/:id/receive',
      name: 'po-receive',
      component: ReceiveView,
      meta: { requiresAuth: true },
    },
    {
      path: '/inbound/putaway',
      name: 'putaway',
      component: PutawayView,
      meta: { requiresAuth: true },
    },
    {
      path: '/outbound/so',
      name: 'so-list',
      component: SoListView,
      meta: { requiresAuth: true },
    },
    {
      path: '/outbound/so/:id',
      name: 'so-detail',
      component: SoDetailView,
      meta: { requiresAuth: true },
    },
    {
      path: '/outbound/so/:id/execute',
      name: 'so-execute',
      component: SoExecuteView,
      meta: { requiresAuth: true },
    },
    {
      path: '/outbound/so/:id/ship',
      name: 'so-ship',
      component: ShipView,
      meta: { requiresAuth: true },
    },
    {
      path: '/reports/stock-summary',
      name: 'stock-summary',
      component: StockSummaryView,
      meta: { requiresAuth: true },
    },
    {
      path: '/reports/location-usage',
      name: 'location-usage',
      component: LocationUsageView,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: UsersView,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/roles',
      name: 'admin-roles',
      component: RolesView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('accessToken')

  if (to.meta.requiresAuth && !token) {
    return { name: 'login' }
  }

  if (to.meta.requiresGuest && token) {
    return { name: 'dashboard' }
  }
})

export default router
