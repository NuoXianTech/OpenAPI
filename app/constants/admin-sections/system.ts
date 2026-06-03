import type { NavigationMenuItem } from '@nuxt/ui'

export const ADMIN_SYSTEM_PATH = '/admin/system'

export const adminSystemLinks: NavigationMenuItem[] = [
  { label: '站点设置', icon: 'i-mdi-cog-outline', to: ADMIN_SYSTEM_PATH, exact: true },
  { label: '用户会话', icon: 'i-mdi-account-clock-outline', to: `${ADMIN_SYSTEM_PATH}/user-session` },
  { label: '验证码', icon: 'i-mdi-shield-key-outline', to: `${ADMIN_SYSTEM_PATH}/captcha` },
  { label: '邮件', icon: 'i-mdi-email-outline', to: `${ADMIN_SYSTEM_PATH}/email` },
  { label: '操作日志', icon: 'i-mdi-clipboard-text-clock-outline', to: `${ADMIN_SYSTEM_PATH}/operation-logs` },
  { label: '登录日志', icon: 'i-mdi-login-variant', to: `${ADMIN_SYSTEM_PATH}/login-logs` }
]

export const adminSystemQuickActions = [
  { label: '操作日志', icon: 'i-mdi-clipboard-text-clock-outline', to: `${ADMIN_SYSTEM_PATH}/operation-logs` },
  { label: '站点设置', icon: 'i-mdi-cog-outline', to: ADMIN_SYSTEM_PATH }
]
