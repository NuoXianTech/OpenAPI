import { parseFetchError } from '~/utils/client-error'
import type { UserOauthBinding } from '~/types/user-settings'

const OAUTH_BIND_ERROR_KEYS: Record<string, string> = {
  state_mismatch: 'user.settings.oauth.errors.stateMismatch',
  login_required: 'user.settings.oauth.errors.loginRequired',
  already_bound_by_other: 'user.settings.oauth.errors.alreadyBoundByOther',
  already_bound_same_provider: 'user.settings.oauth.errors.alreadyBoundSameProvider',
  callback_failed: 'user.settings.oauth.errors.callbackFailed',
  provider_unavailable: 'user.settings.oauth.errors.providerUnavailable',
  oauth_disabled: 'user.settings.oauth.errors.oauthDisabled',
  missing_code: 'user.settings.oauth.errors.missingCode'
}

export function useUserOauthSettings() {
  const toast = useToast()
  const { t } = useI18n()
  const confirm = useConfirmDialog()

  const oauthBindings = ref<UserOauthBinding[]>([])
  const isOauthEnabled = ref(true)
  const isOauthLoading = ref(false)

  async function loadOauthBindings(): Promise<void> {
    isOauthLoading.value = true
    try {
      const response = await $fetch('/api/user/oauth/list')
      isOauthEnabled.value = response.oauthEnabled
      oauthBindings.value = response.providers
    } catch {
      oauthBindings.value = []
    } finally {
      isOauthLoading.value = false
    }
  }

  function startOauthBinding(provider: string): void {
    const returnTo = encodeURIComponent('/user/settings/oauth')
    window.location.href = `/api/auth/oauth/${provider}/start?mode=bind&returnTo=${returnTo}`
  }

  async function unbindOauthProvider(provider: string): Promise<void> {
    await confirm({
      title: t('user.settings.oauth.unbindTitle', { provider }),
      description: t('user.settings.oauth.unbindDescription'),
      onConfirm: async () => {
        try {
          await $fetch(`/api/user/oauth/${provider}/unbind`, { method: 'POST' })
          toast.add({ title: t('user.settings.oauth.unbound'), color: 'success' })
          await loadOauthBindings()
        } catch (error) {
          toast.add({ title: parseFetchError(error, t('user.settings.oauth.unbindFailed')), color: 'error' })
          throw error
        }
      }
    })
  }

  function notifyOauthCallback(query: Record<string, unknown>): void {
    if (query.oauth_bound) {
      toast.add({
        title: t('user.settings.oauth.bound', { provider: String(query.oauth_bound) }),
        color: 'success'
      })
    }
    if (query.oauth_error) {
      const errorCode = String(query.oauth_error)
      toast.add({
        title: t('user.settings.oauth.bindFailed'),
        description: OAUTH_BIND_ERROR_KEYS[errorCode] ? t(OAUTH_BIND_ERROR_KEYS[errorCode]) : errorCode,
        color: 'error'
      })
    }
  }

  return {
    oauthBindings,
    isOauthEnabled,
    isOauthLoading,
    loadOauthBindings,
    startOauthBinding,
    unbindOauthProvider,
    notifyOauthCallback
  }
}
