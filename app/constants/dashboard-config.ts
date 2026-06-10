import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'
import { ADMIN_APIS_PATH } from './admin-sections/apis'
import { ADMIN_USERS_PATH } from './admin-sections/users'
import { ADMIN_CONTENT_PATH } from './admin-sections/content'
import { ADMIN_SYSTEM_PATH } from './admin-sections/system'
import { ADMIN_ANALYTICS_PATH, ADMIN_LOGS_PATH } from './admin-sections/logs'
import { ADMIN_REDEMPTION_CODES_PATH } from './admin-sections/redemption-codes'
import { ADMIN_OVERVIEW_PATH } from './admin-sections/overview'
import { USER_OVERVIEW_PATH } from './user-sections/overview'

export interface DashboardNavGroup {
  label?: string
  items: NavigationMenuItem[]
}

export interface DashboardBrand {
  label: string
  icon: string
  to: string
}

export interface DashboardConfig {
  id: 'admin' | 'user'
  brand: DashboardBrand
  groups: DashboardNavGroup[]
  footerLinks: NavigationMenuItem[]
  userMenuExtra?: (ctx: { logout: () => Promise<void> | void }) => DropdownMenuItem[][]
  loginRedirect: string
}

export const adminDashboardConfig: Omit<DashboardConfig, 'brand'> & { brand: (siteName: string) => DashboardBrand } = {
  id: 'admin',
  brand: siteName => ({
    label: siteName || 'OpenAPI',
    icon: 'i-mdi-shield-crown-outline',
    to: ADMIN_OVERVIEW_PATH
  }),
  groups: [
    {
      label: '常规',
      items: [
        { label: '概览', icon: 'i-mdi-view-dashboard-outline', to: ADMIN_OVERVIEW_PATH },
        { label: '数据看板', icon: 'i-mdi-chart-box-outline', to: ADMIN_ANALYTICS_PATH },
        { label: '调用日志', icon: 'i-mdi-text-box-search-outline', to: ADMIN_LOGS_PATH }
      ]
    },
    {
      label: '运营',
      items: [
        { label: '兑换码', icon: 'i-mdi-ticket-percent-outline', to: ADMIN_REDEMPTION_CODES_PATH },
        { label: '内容管理', icon: 'i-mdi-bullhorn-outline', to: ADMIN_CONTENT_PATH },
      ]
    },
    {
      label: '管理员',
      items: [
        { label: '接口管理', icon: 'i-mdi-cog-outline', to: ADMIN_APIS_PATH },
        { label: '用户管理', icon: 'i-mdi-account-group-outline', to: ADMIN_USERS_PATH },
        { label: '系统设置', icon: 'i-mdi-cog-outline', to: ADMIN_SYSTEM_PATH }
      ]
    }
  ],
  footerLinks: [
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ],
  userMenuExtra: () => [[
    { label: '站点设置', icon: 'i-mdi-cog-outline', to: ADMIN_SYSTEM_PATH },
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ]],
  loginRedirect: '/admin/login'
}

export const userDashboardConfig: Omit<DashboardConfig, 'brand'> & { brand: (siteName: string) => DashboardBrand } = {
  id: 'user',
  brand: siteName => ({
    label: siteName || 'OpenAPI',
    icon: 'i-mdi-account-circle-outline',
    to: USER_OVERVIEW_PATH
  }),
  groups: [
    {
      label: '常规',
      items: [
        { label: '概览', icon: 'i-mdi-view-dashboard-outline', to: USER_OVERVIEW_PATH },
        { label: 'API 密钥', icon: 'i-mdi-key-outline', to: '/user/apikeys' },
        { label: '使用日志', icon: 'i-mdi-history', to: '/user/logs' }
      ]
    },
    {
      label: '个人',
      items: [
        { label: '积分', icon: 'i-mdi-cash-multiple', to: '/user/credits' },
        { label: '设置', icon: 'i-mdi-account-cog-outline', to: '/user/settings' }
      ]
    }
  ],
  footerLinks: [
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ],
  userMenuExtra: () => [[
    { label: '设置', icon: 'i-mdi-account-cog-outline', to: '/user/settings' },
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ]],
  loginRedirect: '/login'
}
