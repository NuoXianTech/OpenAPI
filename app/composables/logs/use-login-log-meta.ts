import type { LoginFailureReason, LoginMethod } from '#shared/types/login-log'

export type LoginMethodColor = 'info' | 'neutral'

interface LoginMethodMeta {
  icon: string
  color: LoginMethodColor
}

const LOGIN_METHOD_META: Record<LoginMethod, LoginMethodMeta> = {
  password: { icon: 'i-mdi-form-textbox-password', color: 'neutral' },
  oauth_github: { icon: 'i-mdi-github', color: 'neutral' },
  oauth_qq: { icon: 'i-mdi-qqchat', color: 'info' }
}

const LOGIN_METHOD_MESSAGE_KEYS = {
  password: 'common.loginLogs.methods.password',
  oauth_github: 'common.loginLogs.methods.github',
  oauth_qq: 'common.loginLogs.methods.qq'
} as const satisfies Record<LoginMethod, string>

const LOGIN_FAILURE_MESSAGE_KEYS = {
  invalid_password: 'common.loginLogs.failures.invalidPassword',
  banned: 'common.loginLogs.failures.banned',
  not_active: 'common.loginLogs.failures.notActive',
  oauth_user_unavailable: 'common.loginLogs.failures.oauthUserUnavailable'
} as const satisfies Record<LoginFailureReason, string>

export function useLoginLogMeta() {
  const { t } = useI18n()

  function getLoginMethodLabel(method: string): string {
    const messageKey = LOGIN_METHOD_MESSAGE_KEYS[method as LoginMethod]
    return messageKey ? t(messageKey) : method
  }

  function getLoginFailureLabel(reason: string | null): string {
    if (!reason) return t('common.states.failure')
    const messageKey = LOGIN_FAILURE_MESSAGE_KEYS[reason as LoginFailureReason]
    return messageKey ? t(messageKey) : reason
  }

  function getLoginMethodColor(method: string): LoginMethodColor {
    return LOGIN_METHOD_META[method as LoginMethod]?.color ?? 'neutral'
  }

  function getLoginMethodIcon(method: string): string | undefined {
    return LOGIN_METHOD_META[method as LoginMethod]?.icon
  }

  return {
    getLoginFailureLabel,
    getLoginMethodColor,
    getLoginMethodIcon,
    getLoginMethodLabel
  }
}
