import type { NavigationMenuItem } from '@nuxt/ui'

export const USER_SETTINGS_PATH = '/user/settings'

export const userSettingsLinks: NavigationMenuItem[] = [
  { label: '个人资料', icon: 'i-mdi-account-circle-outline', to: USER_SETTINGS_PATH, exact: true },
  { label: '密码和安全', icon: 'i-mdi-shield-lock-outline', to: `${USER_SETTINGS_PATH}/security` },
  { label: '第三方账号', icon: 'i-mdi-link-variant', to: `${USER_SETTINGS_PATH}/connections` }
]
