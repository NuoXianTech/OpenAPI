import type { LoginFailureReason, LoginMethod } from '#shared/types/login-log'

export type LoginLogBadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export interface LoginMethodMeta {
  label: string
  icon: string
  color: LoginLogBadgeColor
}

export const LOGIN_METHOD_META: Record<LoginMethod, LoginMethodMeta> = {
  password: { label: '账号密码', icon: 'i-lucide-lock-keyhole', color: 'neutral' },
  oauth_github: { label: 'GitHub', icon: 'i-lucide-github', color: 'neutral' },
  oauth_qq: { label: 'QQ', icon: 'i-lucide-message-circle', color: 'info' }
}

const LOGIN_FAILURE_REASON_LABELS: Record<LoginFailureReason, string> = {
  invalid_password: '密码错误',
  banned: '账号被封禁',
  not_active: '邮箱未验证',
  oauth_user_unavailable: '账号不可用'
}

export function loginMethodLabel(method: string): string {
  return LOGIN_METHOD_META[method as LoginMethod]?.label ?? method
}

export function loginFailureReasonLabel(reason: string | null): string {
  if (!reason) return '失败'
  return LOGIN_FAILURE_REASON_LABELS[reason as LoginFailureReason] ?? reason
}
