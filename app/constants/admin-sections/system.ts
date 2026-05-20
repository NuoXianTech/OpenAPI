export const ADMIN_SYSTEM_PATH = '/admin/system'

export const adminSystemTabs = [
  { value: 'settings', label: '站点设置', icon: 'i-mdi-cog-outline' },
  { value: 'oauth-providers', label: '第三方登录', icon: 'i-mdi-shield-key-outline' },
  { value: 'operation-logs', label: '操作日志', icon: 'i-mdi-clipboard-text-clock-outline' },
  { value: 'profile', label: '个人信息', icon: 'i-mdi-account-circle-outline' }
] as const

export type AdminSystemTab = typeof adminSystemTabs[number]['value']

export const adminSystemHref = (tab: AdminSystemTab) => `${ADMIN_SYSTEM_PATH}#${tab}`

export const adminSystemQuickActions = [
  { tab: 'operation-logs', label: '操作日志', icon: 'i-mdi-clipboard-text-clock-outline' },
  { tab: 'settings', label: '站点设置', icon: 'i-mdi-cog-outline' }
] as const satisfies ReadonlyArray<{ tab: AdminSystemTab, label: string, icon: string }>
