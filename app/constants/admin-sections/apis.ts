import type { NavigationMenuItem } from '@nuxt/ui'

export const ADMIN_APIS_PATH = '/admin/apis'

export const adminApisLinks: NavigationMenuItem[] = [
  { label: '接口治理', icon: 'i-mdi-api', to: ADMIN_APIS_PATH, exact: true },
  { label: '分类管理', icon: 'i-mdi-shape-outline', to: `${ADMIN_APIS_PATH}/categories` },
  { label: '调用统计', icon: 'i-mdi-chart-bar', to: `${ADMIN_APIS_PATH}/calls` }
]

export const adminApisQuickActions = [
  { label: '登记接口', icon: 'i-mdi-plus-circle-outline', to: ADMIN_APIS_PATH },
  { label: '查看调用日志', icon: 'i-mdi-history', to: `${ADMIN_APIS_PATH}/calls` }
]
