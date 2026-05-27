import { createRouter, createMemoryHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: DashboardView, meta: { title: '仪表盘' } },
    {
      path: '/requirements',
      component: () => import('../views/RequirementListView.vue'),
      meta: { title: '需求管理' }
    },
    {
      path: '/requirements/new',
      component: () => import('../views/RequirementInput.vue'),
      meta: { title: '新建需求' }
    },
    {
      path: '/requirements/:id',
      component: () => import('../views/RequirementDetail.vue'),
      meta: { title: '需求详情' }
    },
    {
      path: '/test-cases',
      component: () => import('../views/TestCaseListView.vue'),
      meta: { title: '测试用例' }
    },
    {
      path: '/test-cases/:requirementId',
      component: () => import('../views/TestCaseView.vue'),
      meta: { title: '用例详情' }
    },
    {
      path: '/scripts',
      component: () => import('../views/ScriptListView.vue'),
      meta: { title: '脚本管理' }
    },
    {
      path: '/scripts/:requirementId',
      component: () => import('../views/ScriptView.vue'),
      meta: { title: '脚本详情' }
    },
    {
      path: '/settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { title: '设置' }
    }
  ]
})

export default router
