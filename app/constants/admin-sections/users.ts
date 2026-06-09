import type { NavigationMenuItem } from '@nuxt/ui'

export const ADMIN_USERS_PATH = '/admin/users'

export const adminUsersLinks: NavigationMenuItem[] = [
  { label: '用户', icon: 'i-mdi-account-group-outline', to: ADMIN_USERS_PATH, exact: true },
  { label: '登录日志', icon: 'i-mdi-login-variant', to: `${ADMIN_USERS_PATH}/login-logs` },
  { label: '积分日志', icon: 'i-mdi-cash-multiple', to: `${ADMIN_USERS_PATH}/credit-transactions` }
]

export const adminUsersQuickActions = [
  { label: '调整用户积分', icon: 'i-mdi-cash-multiple', to: ADMIN_USERS_PATH }
]
