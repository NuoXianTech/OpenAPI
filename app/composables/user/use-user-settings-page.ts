import { parseFetchError } from '~/utils/client-error'
import type { LoginLogRow } from '#shared/types/login-log'

export interface ProfileData {
  id: number
  username: string
  email: string
  avatarUrl: string
  displayName: string | null
  emailVerifiedAt: string | null
  createdAt: string
}

export interface OauthBinding {
  provider: string
  displayName: string
  icon: string
  enabled: boolean
  bound: boolean
  nickname: string | null
  email: string | null
  avatarUrl: string | null
  providerUserId: string | null
  linkedAt: string | null
}

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

export function useUserSettingsPage() {
  const toast = useToast()
  const { t } = useI18n()
  const { fetchMe } = useAuth()
  const confirm = useConfirmDialog()

  const profile = ref<ProfileData | null>(null)
  const profileLoading = ref(false)

  const oauthList = ref<OauthBinding[]>([])
  const oauthEnabled = ref(true)
  const oauthLoading = ref(false)

  const loginActivity = ref<LoginLogRow[]>([])
  const loginActivityLoading = ref(false)

  async function loadProfile() {
    profileLoading.value = true
    try {
      profile.value = await $fetch<ProfileData>('/api/user/profile')
    } catch {
      profile.value = null
    } finally {
      profileLoading.value = false
    }
  }

  async function updateProfile(displayName: string) {
    await $fetch('/api/user/profile', {
      method: 'PUT',
      body: { displayName: displayName.trim() }
    })
    toast.add({ title: t('user.settings.profile.updated'), color: 'success' })
    await Promise.all([loadProfile(), fetchMe(true)])
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await $fetch('/api/user/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    })
    toast.add({
      title: t('user.settings.security.passwordUpdated'),
      description: t('user.settings.security.otherSessionsRevoked'),
      color: 'success'
    })
  }

  async function requestEmailChange(currentPassword: string, newEmail: string): Promise<string> {
    const res = await $fetch<{ pendingEmail: string }>('/api/user/request-email-change', {
      method: 'POST',
      body: { currentPassword, newEmail }
    })
    toast.add({
      title: t('user.settings.email.verificationSent'),
      description: t('user.settings.email.verificationSentDescription', { email: res.pendingEmail }),
      color: 'success'
    })
    return res.pendingEmail
  }

  async function loadOauth() {
    oauthLoading.value = true
    try {
      const res = await $fetch<{ oauthEnabled: boolean, providers: OauthBinding[] }>('/api/user/oauth/list')
      oauthEnabled.value = res.oauthEnabled
      oauthList.value = res.providers
    } catch {
      oauthList.value = []
    } finally {
      oauthLoading.value = false
    }
  }

  async function loadLoginActivity() {
    loginActivityLoading.value = true
    try {
      const res = await $fetch<{ items: LoginLogRow[], total: number }>('/api/user/login-logs/list')
      loginActivity.value = res?.items || []
    } catch {
      loginActivity.value = []
    } finally {
      loginActivityLoading.value = false
    }
  }

  function startBind(provider: string) {
    const returnTo = encodeURIComponent('/user/settings/oauth')
    window.location.href = `/api/auth/oauth/${provider}/start?mode=bind&returnTo=${returnTo}`
  }

  async function unbind(provider: string) {
    await confirm({
      title: t('user.settings.oauth.unbindTitle', { provider }),
      description: t('user.settings.oauth.unbindDescription'),
      onConfirm: async () => {
        try {
          await $fetch(`/api/user/oauth/${provider}/unbind`, { method: 'POST' })
          toast.add({ title: t('user.settings.oauth.unbound'), color: 'success' })
          await loadOauth()
        } catch (err) {
          toast.add({ title: parseFetchError(err, t('user.settings.oauth.unbindFailed')), color: 'error' })
          throw err
        }
      }
    })
  }

  function notifyOauthCallback(query: Record<string, unknown>) {
    if (query.oauth_bound) {
      toast.add({
        title: t('user.settings.oauth.bound', { provider: String(query.oauth_bound) }),
        color: 'success'
      })
    }
    if (query.oauth_error) {
      const code = String(query.oauth_error)
      toast.add({
        title: t('user.settings.oauth.bindFailed'),
        description: OAUTH_BIND_ERROR_KEYS[code] ? t(OAUTH_BIND_ERROR_KEYS[code]) : code,
        color: 'error'
      })
    }
  }

  return {
    profile,
    profileLoading,
    oauthList,
    oauthEnabled,
    oauthLoading,
    loginActivity,
    loginActivityLoading,
    loadProfile,
    updateProfile,
    changePassword,
    requestEmailChange,
    loadOauth,
    loadLoginActivity,
    startBind,
    unbind,
    notifyOauthCallback
  }
}
