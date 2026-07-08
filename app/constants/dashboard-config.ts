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
  USER_API_KEYS_PATH,
  USER_CREDITS_PATH,
  USER_LOGS_PATH,
  USER_OVERVIEW_PATH,
  USER_SETTINGS_PATH
} from './dashboard-sections'

interface DashboardNavGroup {
  label?: string
  items: NavigationMenuItem[]
}

interface DashboardBrand {
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

const userDashboardGroups: DashboardNavGroup[] = [
  {
    label: '常规',
    items: [
      { label: '用户概览', icon: 'i-mdi-view-dashboard-outline', to: USER_OVERVIEW_PATH },
      { label: 'API 密钥', icon: 'i-mdi-key-outline', to: USER_API_KEYS_PATH },
      { label: '使用日志', icon: 'i-mdi-history', to: USER_LOGS_PATH }
    ]
  },
  {
    label: '个人',
    items: [
      { label: '积分', icon: 'i-mdi-cash-multiple', to: USER_CREDITS_PATH },
      { label: '设置', icon: 'i-mdi-account-cog-outline', to: USER_SETTINGS_PATH }
    ]
  }
]

export const adminDashboardConfig: DashboardStaticConfig = {
  id: 'admin',
  brand: siteName => ({
    label: siteName || 'OpenAPI',
    icon: 'i-mdi-shield-crown-outline',
    to: ADMIN_OVERVIEW_PATH
  }),
  groups: [
    ...userDashboardGroups,
    {
      label: '管理',
      items: [
        { label: '管理概览', icon: 'i-mdi-shield-crown-outline', to: ADMIN_OVERVIEW_PATH },
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
      label: '系统',
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
    { label: '用户设置', icon: 'i-mdi-account-cog-outline', to: USER_SETTINGS_PATH },
    { label: '站点设置', icon: 'i-mdi-cog-outline', to: ADMIN_SYSTEM_PATH },
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ]],
  loginRedirect: '/login'
}

export const userDashboardConfig: DashboardStaticConfig = {
  id: 'user',
  brand: siteName => ({
    label: siteName || 'OpenAPI',
    icon: 'i-mdi-account-circle-outline',
    to: USER_OVERVIEW_PATH
  }),
  groups: userDashboardGroups,
  footerLinks: [
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ],
  userMenuExtra: () => [[
    { label: '个人设置', icon: 'i-mdi-account-cog-outline', to: USER_SETTINGS_PATH },
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ]],
  loginRedirect: '/login'
}
