import type { ComputedRef } from 'vue'
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH
} from '#shared/config/auth-validation'
import type { AuthValidationMessages } from '~/utils/form-validation'

export function useAuthValidationMessages(): ComputedRef<AuthValidationMessages> {
  const { t } = useI18n()

  return computed(() => ({
    email: {
      required: t('auth.validation.emailRequired'),
      invalid: t('auth.validation.emailInvalid')
    },
    username: {
      required: t('auth.validation.usernameRequired'),
      tooShort: t('auth.validation.usernameTooShort', { count: USERNAME_MIN_LENGTH }),
      tooLong: t('auth.validation.usernameTooLong', { count: USERNAME_MAX_LENGTH }),
      invalidCharacters: t('auth.validation.usernameInvalidCharacters')
    },
    password: {
      required: t('auth.validation.passwordRequired'),
      tooShort: t('auth.validation.passwordTooShort', { count: PASSWORD_MIN_LENGTH })
    },
    confirmation: {
      required: t('auth.validation.confirmPasswordRequired'),
      mismatch: t('auth.validation.passwordMismatch')
    }
  }))
}
