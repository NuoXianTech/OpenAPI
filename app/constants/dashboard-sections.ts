import type { NavigationMenuItem } from '@nuxt/ui'

interface DashboardSectionConfig {
  id: string
  title: string
  items: NavigationMenuItem[]
}

export const ADMIN_OVERVIEW_PATH = '/admin/overview'
export const ADMIN_ANALYTICS_PATH = '/admin/analytics'
export const ADMIN_LOGS_PATH = '/admin/logs'
export const ADMIN_REDEMPTION_CODES_PATH = '/admin/redemption-codes'
export const ADMIN_CONTENT_PATH = '/admin/content'
export const ADMIN_APIS_PATH = '/admin/apis'
export const ADMIN_USERS_PATH = '/admin/users'
export const ADMIN_SYSTEM_PATH = '/admin/system'

export const USER_OVERVIEW_PATH = '/user/overview'
export const USER_CREDITS_PATH = '/user/credits'
export const USER_SETTINGS_PATH = '/user/settings'

const adminContentLinks: NavigationMenuItem[] = [
  { label: '公告', icon: 'i-lucide-megaphone', to: ADMIN_CONTENT_PATH, exact: true },
  { label: '通知', icon: 'i-lucide-bell', to: `${ADMIN_CONTENT_PATH}/notifications` },
  { label: '友情链接', icon: 'i-lucide-link', to: `${ADMIN_CONTENT_PATH}/friend-links` }
]

const adminApisLinks: NavigationMenuItem[] = [
  { label: '接口管理', icon: 'i-lucide-braces', to: ADMIN_APIS_PATH, exact: true },
  { label: '分类管理', icon: 'i-lucide-shapes', to: `${ADMIN_APIS_PATH}/categories` }
]

const adminUsersLinks: NavigationMenuItem[] = [
  { label: '用户管理', icon: 'i-lucide-users-round', to: ADMIN_USERS_PATH, exact: true },
  { label: '登录日志', icon: 'i-lucide-log-in', to: `${ADMIN_USERS_PATH}/login-logs` },
  { label: '积分日志', icon: 'i-lucide-coins', to: `${ADMIN_USERS_PATH}/credit-logs` }
]

const adminSystemLinks: NavigationMenuItem[] = [
  { label: '站点设置', icon: 'i-lucide-settings', to: ADMIN_SYSTEM_PATH, exact: true },
  { label: '用户会话', icon: 'i-lucide-clock', to: `${ADMIN_SYSTEM_PATH}/user-session` },
  { label: '验证码', icon: 'i-lucide-shield-check', to: `${ADMIN_SYSTEM_PATH}/captcha` },
  { label: '邮件', icon: 'i-lucide-mail', to: `${ADMIN_SYSTEM_PATH}/email` },
  { label: '操作日志', icon: 'i-lucide-clipboard-clock', to: `${ADMIN_SYSTEM_PATH}/operation-logs` }
]

const userCreditsLinks: NavigationMenuItem[] = [
  { label: '概览', icon: 'i-lucide-wallet', to: USER_CREDITS_PATH, exact: true },
  { label: '签到兑换', icon: 'i-lucide-gift', to: `${USER_CREDITS_PATH}/earn` },
  { label: '流水明细', icon: 'i-lucide-list', to: `${USER_CREDITS_PATH}/transactions` }
]

const userSettingsLinks: NavigationMenuItem[] = [
  { label: '个人资料', icon: 'i-lucide-circle-user-round', to: USER_SETTINGS_PATH, exact: true },
  { label: '密码和安全', icon: 'i-lucide-shield', to: `${USER_SETTINGS_PATH}/security` },
  { label: '第三方账号', icon: 'i-lucide-link', to: `${USER_SETTINGS_PATH}/connections` }
]

export const adminContentSection: DashboardSectionConfig = {
  id: 'admin-content',
  title: '内容管理',
  items: adminContentLinks
}

export const adminApisSection: DashboardSectionConfig = {
  id: 'admin-apis',
  title: '接口管理',
  items: adminApisLinks
}

export const adminUsersSection: DashboardSectionConfig = {
  id: 'admin-users',
  title: '用户中心',
  items: adminUsersLinks
}

export const adminSystemSection: DashboardSectionConfig = {
  id: 'admin-system',
  title: '系统',
  items: adminSystemLinks
}

export const userCreditsSection: DashboardSectionConfig = {
  id: 'user-credits',
  title: '积分',
  items: userCreditsLinks
}

export const userSettingsSection: DashboardSectionConfig = {
  id: 'user-settings',
  title: '个人设置',
  items: userSettingsLinks
}
