import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'
import {
  ADMIN_ANALYTICS_PATH,
  ADMIN_APIS_PATH,
  ADMIN_CONTENT_PATH,
  ADMIN_LOGS_PATH,
  ADMIN_OVERVIEW_PATH,
  ADMIN_REDEMPTION_CODES_PATH,
  ADMIN_SYSTEM_PATH,
  ADMIN_USERS_PATH,
  USER_OVERVIEW_PATH
} from './dashboard-sections'

interface DashboardNavGroup {
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

export interface DashboardStaticConfig extends Omit<DashboardConfig, 'brand'> {
  brand: (siteName: string) => DashboardBrand
}

export const adminDashboardConfig: DashboardStaticConfig = {
  id: 'admin',
  brand: siteName => ({
    label: siteName || 'OpenAPI',
    icon: 'i-lucide-crown',
    to: ADMIN_OVERVIEW_PATH
  }),
  groups: [
    {
      label: '常规',
      items: [
        { label: '概览', icon: 'i-lucide-layout-dashboard', to: ADMIN_OVERVIEW_PATH },
        { label: '数据看板', icon: 'i-lucide-chart-no-axes-combined', to: ADMIN_ANALYTICS_PATH },
        { label: '调用日志', icon: 'i-lucide-file-search', to: ADMIN_LOGS_PATH }
      ]
    },
    {
      label: '运营',
      items: [
        { label: '兑换码', icon: 'i-lucide-ticket-percent', to: ADMIN_REDEMPTION_CODES_PATH },
        { label: '内容管理', icon: 'i-lucide-megaphone', to: ADMIN_CONTENT_PATH },
      ]
    },
    {
      label: '管理员',
      items: [
        { label: '接口管理', icon: 'i-lucide-settings', to: ADMIN_APIS_PATH },
        { label: '用户管理', icon: 'i-lucide-users-round', to: ADMIN_USERS_PATH },
        { label: '系统设置', icon: 'i-lucide-settings', to: ADMIN_SYSTEM_PATH }
      ]
    }
  ],
  footerLinks: [
    { label: '返回前台', icon: 'i-lucide-arrow-left', to: '/' }
  ],
  userMenuExtra: () => [[
    { label: '站点设置', icon: 'i-lucide-settings', to: ADMIN_SYSTEM_PATH },
    { label: '返回前台', icon: 'i-lucide-arrow-left', to: '/' }
  ]],
  loginRedirect: '/admin/login'
}

export const userDashboardConfig: DashboardStaticConfig = {
  id: 'user',
  brand: siteName => ({
    label: siteName || 'OpenAPI',
    icon: 'i-lucide-circle-user-round',
    to: USER_OVERVIEW_PATH
  }),
  groups: [
    {
      label: '常规',
      items: [
        { label: '概览', icon: 'i-lucide-layout-dashboard', to: USER_OVERVIEW_PATH },
        { label: 'API 密钥', icon: 'i-lucide-key-round', to: '/user/apikeys' },
        { label: '使用日志', icon: 'i-lucide-history', to: '/user/logs' }
      ]
    },
    {
      label: '个人',
      items: [
        { label: '积分', icon: 'i-lucide-coins', to: '/user/credits' },
        { label: '设置', icon: 'i-lucide-user-round-cog', to: '/user/settings' }
      ]
    }
  ],
  footerLinks: [
    { label: '返回前台', icon: 'i-lucide-arrow-left', to: '/' }
  ],
  userMenuExtra: () => [[
    { label: '设置', icon: 'i-lucide-user-round-cog', to: '/user/settings' },
    { label: '返回前台', icon: 'i-lucide-arrow-left', to: '/' }
  ]],
  loginRedirect: '/login'
}
