import type { NavigationMenuItem, DropdownMenuItem, CommandPaletteItem } from '@nuxt/ui'

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
      items: [
        { label: '仪表盘', icon: 'i-mdi-view-dashboard-outline', to: '/admin' }
      ]
    },
    {
      label: '业务',
      items: [
        { label: 'API 中心', icon: 'i-mdi-api', to: '/admin/api-hub' },
        { label: '会员中心', icon: 'i-mdi-account-group-outline', to: '/admin/members' }
      ]
    },
    {
      label: '运营',
      items: [
        { label: '内容管理', icon: 'i-mdi-bullhorn-outline', to: '/admin/content' },
        { label: '系统', icon: 'i-mdi-cog-outline', to: '/admin/system' }
      ]
    }
  ],
  footerLinks: [
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ],
  quickActions: [
    { label: '登记接口', icon: 'i-mdi-plus-circle-outline', to: '/admin/api-hub#governance' },
    { label: '发布公告', icon: 'i-mdi-bullhorn-outline', to: '/admin/content#announcements' },
    { label: '生成兑换码', icon: 'i-mdi-ticket-percent-outline', to: '/admin/members#redemption-codes' },
    { label: '调整用户积分', icon: 'i-mdi-cash-multiple', to: '/admin/members#users' },
    { label: '查看调用日志', icon: 'i-mdi-history', to: '/admin/api-hub#calls' },
    { label: '操作日志', icon: 'i-mdi-clipboard-text-clock-outline', to: '/admin/system#operation-logs' },
    { label: '站点设置', icon: 'i-mdi-cog-outline', to: '/admin/system#settings' }
  ],
  userMenuExtra: () => [[
    { label: '个人信息', icon: 'i-mdi-account-circle-outline', to: '/admin/system#profile' },
    { label: '站点设置', icon: 'i-mdi-cog-outline', to: '/admin/system#settings' },
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ]],
  loginRedirect: '/admin/login',
  notificationLink: '/admin/content#notifications'
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
      items: [
        { label: '概览', icon: 'i-mdi-view-dashboard-outline', to: '/user' }
      ]
    },
    {
      label: '资源',
      items: [
        { label: 'API Key', icon: 'i-mdi-key-outline', to: '/user/apikeys' },
        { label: '调用日志', icon: 'i-mdi-history', to: '/user/calls' }
      ]
    },
    {
      label: '账户',
      items: [
        { label: '积分', icon: 'i-mdi-cash-multiple', to: '/user/credits' },
        { label: '个人设置', icon: 'i-mdi-account-cog-outline', to: '/user/profile' },
        { label: '通知中心', icon: 'i-mdi-bell-outline', to: '/user/notifications' }
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
    { label: '个人设置', icon: 'i-mdi-account-cog-outline', to: '/user/profile' },
    { label: '通知中心', icon: 'i-mdi-bell-outline', to: '/user/notifications' },
    { label: '返回前台', icon: 'i-mdi-arrow-left', to: '/' }
  ]],
  loginRedirect: '/login',
  notificationLink: '/user/notifications'
}
