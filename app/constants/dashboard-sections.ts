import type { NavigationMenuItem } from '@nuxt/ui'

interface DashboardSectionConfig {
  id: string
  title: string
  items: NavigationMenuItem[]
}

export const ADMIN_OVERVIEW_PATH = '/admin/overview'
export const ADMIN_ANALYTICS_PATH = '/admin/analytics'
export const ADMIN_LOGS_PATH = '/admin/logs'
export const ADMIN_LOGIN_LOGS_PATH = `${ADMIN_LOGS_PATH}/login`
export const ADMIN_CREDITS_PATH = '/admin/credits'
export const ADMIN_CREDIT_USERS_PATH = `${ADMIN_CREDITS_PATH}/users`
export const ADMIN_CREDIT_TRANSACTIONS_PATH = `${ADMIN_CREDITS_PATH}/transactions`
export const ADMIN_OPERATION_LOGS_PATH = `${ADMIN_LOGS_PATH}/operations`
export const ADMIN_REDEMPTION_CODES_PATH = `${ADMIN_CREDITS_PATH}/redemption-codes`
export const ADMIN_CONTENT_PATH = '/admin/content'
export const ADMIN_APIS_PATH = '/admin/apis'
export const ADMIN_USERS_PATH = '/admin/users'
export const ADMIN_SYSTEM_PATH = '/admin/system'

export const USER_OVERVIEW_PATH = '/user/overview'
export const USER_API_KEYS_PATH = '/user/apikeys'
export const USER_LOGS_PATH = '/user/logs'
export const USER_CREDITS_PATH = '/user/credits'
export const USER_CREDITS_REWARDS_PATH = `${USER_CREDITS_PATH}/rewards`
export const USER_SETTINGS_PATH = '/user/settings'

const adminContentLinks: NavigationMenuItem[] = [
  { label: '公告', icon: 'i-mdi-bullhorn-outline', to: ADMIN_CONTENT_PATH, exact: true },
  { label: '通知', icon: 'i-mdi-bell-outline', to: `${ADMIN_CONTENT_PATH}/notifications` },
  { label: '友情链接', icon: 'i-mdi-link-variant', to: `${ADMIN_CONTENT_PATH}/friend-links` }
]

const adminApisLinks: NavigationMenuItem[] = [
  { label: '接口管理', icon: 'i-mdi-api', to: ADMIN_APIS_PATH, exact: true },
  { label: '分类管理', icon: 'i-mdi-shape-outline', to: `${ADMIN_APIS_PATH}/categories` }
]

const adminLogsLinks: NavigationMenuItem[] = [
  { label: '调用日志', icon: 'i-mdi-text-box-search-outline', to: ADMIN_LOGS_PATH, exact: true },
  { label: '登录日志', icon: 'i-mdi-login-variant', to: ADMIN_LOGIN_LOGS_PATH },
  { label: '操作日志', icon: 'i-mdi-clipboard-text-clock-outline', to: ADMIN_OPERATION_LOGS_PATH }
]

const adminCreditsLinks: NavigationMenuItem[] = [
  { label: '概览', icon: 'i-mdi-view-dashboard-outline', to: ADMIN_CREDITS_PATH, exact: true },
  { label: '用户积分', icon: 'i-mdi-account-cash-outline', to: ADMIN_CREDIT_USERS_PATH },
  { label: '积分流水', icon: 'i-mdi-cash-multiple', to: ADMIN_CREDIT_TRANSACTIONS_PATH },
  { label: '兑换码', icon: 'i-mdi-ticket-percent-outline', to: ADMIN_REDEMPTION_CODES_PATH }
]

const adminSystemLinks: NavigationMenuItem[] = [
  { label: '站点设置', icon: 'i-mdi-cog-outline', to: ADMIN_SYSTEM_PATH, exact: true },
  { label: '用户会话', icon: 'i-mdi-account-clock-outline', to: `${ADMIN_SYSTEM_PATH}/user-session` },
  { label: '验证码', icon: 'i-mdi-shield-key-outline', to: `${ADMIN_SYSTEM_PATH}/captcha` },
  { label: '邮件', icon: 'i-mdi-email-outline', to: `${ADMIN_SYSTEM_PATH}/email` },
  { label: '关于', icon: 'i-mdi-information-outline', to: `${ADMIN_SYSTEM_PATH}/about` }
]

const userCreditsLinks: NavigationMenuItem[] = [
  { label: '概览', icon: 'i-mdi-wallet-outline', to: USER_CREDITS_PATH, exact: true },
  { label: '签到兑换', icon: 'i-mdi-calendar-check-outline', to: USER_CREDITS_REWARDS_PATH },
  { label: '流水明细', icon: 'i-mdi-format-list-bulleted', to: `${USER_CREDITS_PATH}/logs` }
]

const userSettingsLinks: NavigationMenuItem[] = [
  { label: '个人资料', icon: 'i-mdi-account-circle-outline', to: USER_SETTINGS_PATH, exact: true },
  { label: '密码和安全', icon: 'i-mdi-shield-lock-outline', to: `${USER_SETTINGS_PATH}/security` },
  { label: '第三方账号', icon: 'i-mdi-link-variant', to: `${USER_SETTINGS_PATH}/oauth` }
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

export const adminLogsSection: DashboardSectionConfig = {
  id: 'admin-logs',
  title: '日志中心',
  items: adminLogsLinks
}

export const adminCreditsSection: DashboardSectionConfig = {
  id: 'admin-credits',
  title: '积分管理',
  items: adminCreditsLinks
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
