import type { NavigationMenuItem, DropdownMenuItem, CommandPaletteItem } from '@nuxt/ui'
import {
  ADMIN_APIS_PATH,
  adminApisQuickActions
} from './admin-sections/apis'
import {
  ADMIN_MEMBERS_PATH,
  adminMembersQuickActions
} from './admin-sections/members'
import {
  ADMIN_CONTENT_PATH,
  adminContentQuickActions
} from './admin-sections/content'
import {
  ADMIN_SYSTEM_PATH,
  adminSystemQuickActions
} from './admin-sections/system'
import {
  ADMIN_ANALYTICS_PATH,
  ADMIN_LOGS_PATH,
  adminLogsQuickActions
} from './admin-sections/logs'

export interface DashboardNavGroup {
  label?: string
  items: NavigationMenuItem[]
}

export interface DashboardQuickAction {
  label: string
  icon: string
  to?: string
  kbds?: string[]
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
  quickActions?: DashboardQuickAction[]
  userMenuExtra?: (ctx: { logout: () => Promise<void> | void }) => DropdownMenuItem[][]
  loginRedirect: string
  notificationLink: string
}

export type { CommandPaletteItem }

export const adminDashboardConfig: Omit<DashboardConfig, 'brand'> & { brand: (siteName: string) => DashboardBrand } = {
  id: 'admin',
  brand: siteName => ({
    label: siteName || 'OpenAPI',
    icon: 'i-mdi-shield-crown-outline',
    to: '/admin'
  }),
  groups: [
    {
      label: '常规',
      items: [
        { label: '概览', icon: 'i-mdi-view-dashboard-outline', to: '/admin' },
        { label: '数据看板', icon: 'i-mdi-chart-box-outline', to: ADMIN_ANALYTICS_PATH },
        { label: '通用日志', icon: 'i-mdi-text-box-search-outline', to: ADMIN_LOGS_PATH }
      ]
    },
    {
      label: '运营',
      items: [
        { label: '兑换码', icon: 'i-mdi-ticket-percent-outline', to: `/admin/members/redemption-codes` },
        { label: '内容管理', icon: 'i-mdi-bullhorn-outline', to: ADMIN_CONTENT_PATH },
      ]
    },
    {
      label: '管理员',
      items: [
        { label: '接口管理', icon: 'i-mdi-cog-outline', to: ADMIN_APIS_PATH },
        { label: '用户管理', icon: 'i-mdi-account-group-outline', to: ADMIN_MEMBERS_PATH },
        { label: '系统设置', icon: 'i-mdi-cog-outline', to: ADMIN_SYSTEM_PATH }
      ]
    }
  ],
  footerLinks: [
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ],
  quickActions: [
    ...adminApisQuickActions,
    ...adminLogsQuickActions,
    ...adminContentQuickActions,
    ...adminMembersQuickActions,
    ...adminSystemQuickActions
  ],
  userMenuExtra: () => [[
    { label: '个人信息', icon: 'i-mdi-account-circle-outline', to: `${ADMIN_SYSTEM_PATH}/profile` },
    { label: '站点设置', icon: 'i-mdi-cog-outline', to: ADMIN_SYSTEM_PATH },
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ]],
  loginRedirect: '/admin/login',
  notificationLink: `${ADMIN_CONTENT_PATH}/notifications`
}

export const userDashboardConfig: Omit<DashboardConfig, 'brand'> & { brand: (siteName: string) => DashboardBrand } = {
  id: 'user',
  brand: siteName => ({
    label: siteName || 'OpenAPI',
    icon: 'i-mdi-account-circle-outline',
    to: '/user'
  }),
  groups: [
    {
      label: '常规',
      items: [
        { label: '概览', icon: 'i-mdi-view-dashboard-outline', to: '/user' },
        { label: 'API 密钥', icon: 'i-mdi-key-outline', to: '/user/apikeys' },
        { label: '使用日志', icon: 'i-mdi-history', to: '/user/calls' }
      ]
    },
    {
      label: '个人',
      items: [
        { label: '积分', icon: 'i-mdi-cash-multiple', to: '/user/credits' },
        { label: '通知', icon: 'i-mdi-bell-outline', to: '/user/notifications' },
        { label: '个人资料', icon: 'i-mdi-account-cog-outline', to: '/user/profile' }
      ]
    }
  ],
  footerLinks: [
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ],
  quickActions: [
    { label: '生成 API Key', icon: 'i-mdi-key-plus', to: '/user/apikeys' },
    { label: '兑换积分', icon: 'i-mdi-ticket-percent-outline', to: '/user/credits' },
    { label: '查看调用日志', icon: 'i-mdi-history', to: '/user/calls' },
    { label: '修改密码', icon: 'i-mdi-lock-reset', to: '/user/profile' }
  ],
  userMenuExtra: () => [[
    { label: '个人资料', icon: 'i-mdi-account-cog-outline', to: '/user/profile' },
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ]],
  loginRedirect: '/login',
  notificationLink: '/user/notifications'
}
