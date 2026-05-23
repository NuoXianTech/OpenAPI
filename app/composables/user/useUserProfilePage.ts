import { parseFetchError } from '#shared/utils/clientError'

export interface ProfileData {
  id: number
  username: string
  email: string
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

const OAUTH_BIND_ERRORS: Record<string, string> = {
  state_mismatch: 'state 已失效，请重试',
  login_required: '需要先登录普通用户',
  already_bound_by_other: '该第三方账号已被其他用户绑定',
  callback_failed: '回调处理失败',
  provider_unavailable: 'provider 当前不可用',
  oauth_disabled: '站点已关闭第三方登录',
  secret_decrypt_failed: '密钥解密失败，请联系管理员',
  missing_code: '未收到授权 code'
}

export function useUserProfilePage() {
  const toast = useToast()
  const { fetchMe } = useAuth()

  const profile = ref<ProfileData | null>(null)
  const profileLoading = ref(false)

  const oauthList = ref<OauthBinding[]>([])
  const oauthEnabled = ref(true)
  const oauthLoading = ref(false)

  async function loadProfile() {
    profileLoading.value = true
    try {
      profile.value = await $fetch<ProfileData>('/api/user/profile')
    } catch (err) {
      console.error('failed to load profile', err)
    } finally {
      profileLoading.value = false
    }
  }

  async function updateProfile(displayName: string) {
    await $fetch('/api/user/profile', {
      method: 'PUT',
      body: { displayName: displayName.trim() }
    })
    toast.add({ title: '资料已更新', color: 'success' })
    await Promise.all([loadProfile(), fetchMe(true)])
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await $fetch('/api/user/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    })
    toast.add({
      title: '密码已更新',
      description: '其他设备的登录已被注销',
      color: 'success'
    })
  }

  async function requestEmailChange(currentPassword: string, newEmail: string): Promise<string> {
    const res = await $fetch<{ pendingEmail: string }>('/api/user/request-email-change', {
      method: 'POST',
      body: { currentPassword, newEmail }
    })
    toast.add({
      title: '验证邮件已发送',
      description: `请到 ${res.pendingEmail} 邮箱点击确认链接完成更改`,
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
    } catch (err) {
      console.error('failed to load oauth list', err)
      oauthList.value = []
    } finally {
      oauthLoading.value = false
    }
  }

  function startBind(provider: string) {
    const returnTo = encodeURIComponent('/user/profile')
    window.location.href = `/api/auth/oauth/${provider}/start?mode=bind&returnTo=${returnTo}`
  }

  async function unbind(provider: string) {
    if (!confirm(`确认解绑 ${provider} 账号？解绑后将无法使用该方式登录。`)) return
    try {
      await $fetch(`/api/user/oauth/${provider}/unbind`, { method: 'POST' })
      toast.add({ title: '已解绑', color: 'success' })
      await loadOauth()
    } catch (err) {
      toast.add({ title: parseFetchError(err, '解绑失败'), color: 'error' })
    }
  }

  function notifyOauthCallback(query: Record<string, unknown>) {
    if (query.oauth_bound) {
      toast.add({
        title: `已绑定 ${query.oauth_bound}`,
        color: 'success'
      })
    }
    if (query.oauth_error) {
      const code = String(query.oauth_error)
      toast.add({
        title: '绑定失败',
        description: OAUTH_BIND_ERRORS[code] || code,
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
    loadProfile,
    updateProfile,
    changePassword,
    requestEmailChange,
    loadOauth,
    startBind,
    unbind,
    notifyOauthCallback
  }
}
