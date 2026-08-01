import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'
import {
  ADMIN_APIS_PATH,
  ADMIN_CONTENT_PATH,
  ADMIN_CREDITS_PATH,
  ADMIN_LOGS_PATH,
  ADMIN_OVERVIEW_PATH,
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
  workspaceLabel: string
  workspaceIcon: string
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

export interface DashboardConfigFactoryContext {
  t: (key: string) => string
  isAdmin?: boolean
}

function createBackHomeItem({ t }: DashboardConfigFactoryContext) {
  return {
    label: t('common.dashboard.navigation.backToSite'),
    icon: 'i-mdi-arrow-left',
    to: '/',
    exact: true
  }
}

function createUserDashboardGroups({ t }: DashboardConfigFactoryContext): DashboardNavGroup[] {
  return [
    {
      label: t('common.dashboard.groups.workspace'),
      items: [
        { label: t('common.dashboard.navigation.overview'), icon: 'i-mdi-view-dashboard-outline', to: USER_OVERVIEW_PATH },
        { label: t('common.dashboard.navigation.apiKeys'), icon: 'i-mdi-key-outline', to: USER_API_KEYS_PATH },
        { label: t('common.dashboard.navigation.usageLogs'), icon: 'i-mdi-history', to: USER_LOGS_PATH }
      ]
    },
    {
      label: t('common.dashboard.groups.account'),
      items: [
        { label: t('common.dashboard.navigation.credits'), icon: 'i-mdi-wallet-outline', to: USER_CREDITS_PATH },
        { label: t('common.dashboard.navigation.settings'), icon: 'i-mdi-account-cog-outline', to: USER_SETTINGS_PATH }
      ]
    }
  ]
}

export function createAdminDashboardConfig(context: DashboardConfigFactoryContext): DashboardStaticConfig {
  const { t } = context
  const backHomeItem = createBackHomeItem(context)

  return {
    id: 'admin',
    brand: siteName => ({
      label: siteName || 'OpenAPI',
      workspaceLabel: t('common.dashboard.workspaces.admin'),
      workspaceIcon: 'i-mdi-shield-crown-outline',
      to: ADMIN_OVERVIEW_PATH
    }),
    groups: [
      {
        label: t('common.dashboard.groups.management'),
        items: [
          { label: t('common.dashboard.navigation.overview'), icon: 'i-mdi-view-dashboard-outline', to: ADMIN_OVERVIEW_PATH },
          { label: t('common.dashboard.navigation.apiManagement'), icon: 'i-mdi-api', to: ADMIN_APIS_PATH },
          { label: t('common.dashboard.navigation.userManagement'), icon: 'i-mdi-account-group-outline', to: ADMIN_USERS_PATH },
          { label: t('common.dashboard.navigation.creditManagement'), icon: 'i-mdi-cash-multiple', to: ADMIN_CREDITS_PATH },
          { label: t('common.dashboard.navigation.contentManagement'), icon: 'i-mdi-bullhorn-outline', to: ADMIN_CONTENT_PATH },
          { label: t('common.dashboard.navigation.logCenter'), icon: 'i-mdi-text-box-search-outline', to: ADMIN_LOGS_PATH }
        ]
      },
      {
        label: t('common.dashboard.groups.system'),
        items: [
          { label: t('common.dashboard.navigation.systemSettings'), icon: 'i-mdi-cog-outline', to: ADMIN_SYSTEM_PATH }
        ]
      }
    ],
    footerLinks: [
      { label: t('common.dashboard.navigation.switchToUser'), icon: 'i-mdi-console', to: USER_OVERVIEW_PATH },
      backHomeItem
    ],
    userMenuExtra: () => [[
      { label: t('common.dashboard.navigation.profileSettings'), icon: 'i-mdi-account-cog-outline', to: USER_SETTINGS_PATH },
      { label: t('common.dashboard.navigation.siteSettings'), icon: 'i-mdi-cog-outline', to: ADMIN_SYSTEM_PATH },
      backHomeItem
    ]],
    loginRedirect: '/login'
  }
}

export function createUserDashboardConfig(context: DashboardConfigFactoryContext): DashboardStaticConfig {
  const { t, isAdmin = false } = context
  const backHomeItem = createBackHomeItem(context)

  return {
    id: 'user',
    brand: siteName => ({
      label: siteName || 'OpenAPI',
      workspaceLabel: t('common.dashboard.workspaces.developer'),
      workspaceIcon: 'i-mdi-console',
      to: USER_OVERVIEW_PATH
    }),
    groups: createUserDashboardGroups(context),
    footerLinks: [
      ...(isAdmin
        ? [{ label: t('common.dashboard.navigation.switchToAdmin'), icon: 'i-mdi-shield-crown-outline', to: ADMIN_OVERVIEW_PATH }]
        : []),
      backHomeItem
    ],
    userMenuExtra: () => [[
      { label: t('common.dashboard.navigation.profileSettings'), icon: 'i-mdi-account-cog-outline', to: USER_SETTINGS_PATH },
      backHomeItem
    ]],
    loginRedirect: '/login'
  }
}
