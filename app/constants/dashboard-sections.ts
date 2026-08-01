import type { NavigationMenuItem } from '@nuxt/ui'
import type { DashboardConfigFactoryContext } from './dashboard-config'

interface DashboardSectionConfig {
  id: string
  title: string
  items: NavigationMenuItem[]
}

export const ADMIN_OVERVIEW_PATH = '/admin/overview'
export const ADMIN_LOGS_PATH = '/admin/logs'
const ADMIN_LOGIN_LOGS_PATH = `${ADMIN_LOGS_PATH}/login`
export const ADMIN_CREDITS_PATH = '/admin/credits'
export const ADMIN_CREDIT_USERS_PATH = `${ADMIN_CREDITS_PATH}/users`
export const ADMIN_CREDIT_TRANSACTIONS_PATH = `${ADMIN_CREDITS_PATH}/transactions`
const ADMIN_OPERATION_LOGS_PATH = `${ADMIN_LOGS_PATH}/operations`
export const ADMIN_REDEMPTION_CODES_PATH = `${ADMIN_CREDITS_PATH}/redemption-codes`
export const ADMIN_CONTENT_PATH = '/admin/content'
export const ADMIN_APIS_PATH = '/admin/apis'
export const ADMIN_USERS_PATH = '/admin/users'
export const ADMIN_SYSTEM_PATH = '/admin/system'

export const USER_OVERVIEW_PATH = '/user/overview'
export const USER_API_KEYS_PATH = '/user/apikeys'
export const USER_LOGS_PATH = '/user/logs'
export const USER_CREDITS_PATH = '/user/credits'
const USER_CREDITS_REWARDS_PATH = `${USER_CREDITS_PATH}/rewards`
export const USER_SETTINGS_PATH = '/user/settings'

export function createAdminContentSection({ t }: DashboardConfigFactoryContext): DashboardSectionConfig {
  return {
    id: 'admin-content',
    title: t('common.dashboard.navigation.contentManagement'),
    items: [
      { label: t('common.dashboard.sections.announcements'), icon: 'i-mdi-bullhorn-outline', to: ADMIN_CONTENT_PATH, exact: true },
      { label: t('common.dashboard.sections.notifications'), icon: 'i-mdi-bell-outline', to: `${ADMIN_CONTENT_PATH}/notifications` },
      { label: t('common.dashboard.sections.friendLinks'), icon: 'i-mdi-link-variant', to: `${ADMIN_CONTENT_PATH}/friend-links` }
    ]
  }
}

export function createAdminApisSection({ t }: DashboardConfigFactoryContext): DashboardSectionConfig {
  return {
    id: 'admin-apis',
    title: t('common.dashboard.navigation.apiManagement'),
    items: [
      { label: t('common.dashboard.navigation.apiManagement'), icon: 'i-mdi-api', to: ADMIN_APIS_PATH, exact: true },
      { label: t('common.dashboard.sections.categoryManagement'), icon: 'i-mdi-shape-outline', to: `${ADMIN_APIS_PATH}/categories` }
    ]
  }
}

export function createAdminLogsSection({ t }: DashboardConfigFactoryContext): DashboardSectionConfig {
  return {
    id: 'admin-logs',
    title: t('common.dashboard.navigation.logCenter'),
    items: [
      { label: t('common.dashboard.sections.callLogs'), icon: 'i-mdi-text-box-search-outline', to: ADMIN_LOGS_PATH, exact: true },
      { label: t('common.dashboard.sections.loginLogs'), icon: 'i-mdi-login-variant', to: ADMIN_LOGIN_LOGS_PATH },
      { label: t('common.dashboard.sections.operationLogs'), icon: 'i-mdi-clipboard-text-clock-outline', to: ADMIN_OPERATION_LOGS_PATH }
    ]
  }
}

export function createAdminCreditsSection({ t }: DashboardConfigFactoryContext): DashboardSectionConfig {
  return {
    id: 'admin-credits',
    title: t('common.dashboard.navigation.creditManagement'),
    items: [
      { label: t('common.dashboard.navigation.overview'), icon: 'i-mdi-view-dashboard-outline', to: ADMIN_CREDITS_PATH, exact: true },
      { label: t('common.dashboard.sections.userCredits'), icon: 'i-mdi-account-cash-outline', to: ADMIN_CREDIT_USERS_PATH },
      { label: t('common.dashboard.sections.creditTransactions'), icon: 'i-mdi-cash-multiple', to: ADMIN_CREDIT_TRANSACTIONS_PATH },
      { label: t('common.dashboard.sections.redemptionCodes'), icon: 'i-mdi-ticket-percent-outline', to: ADMIN_REDEMPTION_CODES_PATH }
    ]
  }
}

export function createAdminSystemSection({ t }: DashboardConfigFactoryContext): DashboardSectionConfig {
  return {
    id: 'admin-system',
    title: t('common.dashboard.groups.system'),
    items: [
      { label: t('common.dashboard.navigation.siteSettings'), icon: 'i-mdi-cog-outline', to: ADMIN_SYSTEM_PATH, exact: true },
      { label: t('common.dashboard.sections.userSessions'), icon: 'i-mdi-account-clock-outline', to: `${ADMIN_SYSTEM_PATH}/user-session` },
      { label: t('common.dashboard.sections.networkAndProxy'), icon: 'i-mdi-ip-network-outline', to: `${ADMIN_SYSTEM_PATH}/network` },
      { label: t('common.dashboard.sections.captcha'), icon: 'i-mdi-shield-key-outline', to: `${ADMIN_SYSTEM_PATH}/captcha` },
      { label: t('common.dashboard.sections.email'), icon: 'i-mdi-email-outline', to: `${ADMIN_SYSTEM_PATH}/email` },
      { label: t('common.dashboard.sections.about'), icon: 'i-mdi-information-outline', to: `${ADMIN_SYSTEM_PATH}/about` }
    ]
  }
}

export function createUserCreditsSection({ t }: DashboardConfigFactoryContext): DashboardSectionConfig {
  return {
    id: 'user-credits',
    title: t('common.dashboard.navigation.credits'),
    items: [
      { label: t('common.dashboard.navigation.overview'), icon: 'i-mdi-wallet-outline', to: USER_CREDITS_PATH, exact: true },
      { label: t('common.dashboard.sections.checkinAndRedeem'), icon: 'i-mdi-calendar-check-outline', to: USER_CREDITS_REWARDS_PATH },
      { label: t('common.dashboard.sections.transactionDetails'), icon: 'i-mdi-format-list-bulleted', to: `${USER_CREDITS_PATH}/logs` }
    ]
  }
}

export function createUserSettingsSection({ t }: DashboardConfigFactoryContext): DashboardSectionConfig {
  return {
    id: 'user-settings',
    title: t('common.dashboard.navigation.profileSettings'),
    items: [
      { label: t('common.dashboard.sections.profile'), icon: 'i-mdi-account-circle-outline', to: USER_SETTINGS_PATH, exact: true },
      { label: t('common.dashboard.sections.passwordAndSecurity'), icon: 'i-mdi-shield-lock-outline', to: `${USER_SETTINGS_PATH}/security` },
      { label: t('common.dashboard.sections.oauthAccounts'), icon: 'i-mdi-link-variant', to: `${USER_SETTINGS_PATH}/oauth` }
    ]
  }
}
