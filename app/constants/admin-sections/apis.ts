import type { NavigationMenuItem } from '@nuxt/ui'

export const ADMIN_APIS_PATH = '/admin/apis'

export const adminApisLinks: NavigationMenuItem[] = [
  { label: '接口管理', icon: 'i-mdi-api', to: ADMIN_APIS_PATH, exact: true },
  { label: '分类管理', icon: 'i-mdi-shape-outline', to: `${ADMIN_APIS_PATH}/categories` }
]
