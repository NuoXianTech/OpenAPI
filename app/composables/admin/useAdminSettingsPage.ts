import type { InjectionKey } from 'vue'

export interface AdminSettingsForm {
  siteName: string
  siteUrl: string
  siteImg: string
  siteDescription: string
  startTime: string
  sessionMaxAgeSeconds: number
  sessionAbsoluteMaxAgeSeconds: number
  sessionRememberMaxAgeSeconds: number
  registerEmailFilterMode: 'off' | 'whitelist' | 'blacklist'
  registerEmailFilterList: string
  emailVerifyExpiresInMinutes: number
  passwordResetExpiresInMinutes: number
  passwordResetEnabled: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPass: string
  smtpFrom: string
  oauthLoginEnabled: boolean
  oauthForceBinding: boolean
  turnstileEnabled: boolean
  turnstileSiteKey: string
  turnstileSecretKey: string
  turnstileLoginEnabled: boolean
  turnstileRegisterEnabled: boolean
  turnstileAdminLoginEnabled: boolean
  turnstilePublicStatsEnabled: boolean
  turnstilePasswordResetEnabled: boolean
  announcementShowOnHome: boolean
}

function defaultForm(): AdminSettingsForm {
  return {
    siteName: '',
    siteUrl: '',
    siteImg: '',
    siteDescription: '',
    startTime: '',
    sessionMaxAgeSeconds: 86400,
    sessionAbsoluteMaxAgeSeconds: 604800,
    sessionRememberMaxAgeSeconds: 2592000,
    registerEmailFilterMode: 'off',
    registerEmailFilterList: '',
    emailVerifyExpiresInMinutes: 30,
    passwordResetExpiresInMinutes: 30,
    passwordResetEnabled: true,
    smtpHost: '',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    oauthLoginEnabled: true,
    oauthForceBinding: false,
    turnstileEnabled: false,
    turnstileSiteKey: '',
    turnstileSecretKey: '',
    turnstileLoginEnabled: true,
    turnstileRegisterEnabled: true,
    turnstileAdminLoginEnabled: false,
    turnstilePublicStatsEnabled: false,
    turnstilePasswordResetEnabled: true,
    announcementShowOnHome: false,
  }
}

export const ADMIN_SETTINGS_FORM_KEY: InjectionKey<AdminSettingsForm> = Symbol('admin-settings-form')

export function useAdminSettingsForm(): AdminSettingsForm {
  const form = inject(ADMIN_SETTINGS_FORM_KEY)
  if (!form) throw new Error('AdminSettings form not provided')
  return form
}

export function useAdminSettingsPage() {
  const toast = useToast()

  const form = reactive<AdminSettingsForm>(defaultForm())
  const saving = ref(false)

  provide(ADMIN_SETTINGS_FORM_KEY, form)

  const { data, status, refresh } = useLazyFetch<Partial<AdminSettingsForm> | null>('/api/admin/settings/get', {
    default: () => null,
  })

  watch(() => data.value, (val) => {
    if (!val) return
    const d = defaultForm()
    Object.assign(form, {
      siteName: val.siteName || d.siteName,
      siteUrl: val.siteUrl || d.siteUrl,
      siteImg: val.siteImg || d.siteImg,
      siteDescription: val.siteDescription || d.siteDescription,
      startTime: val.startTime || d.startTime,
      sessionMaxAgeSeconds: val.sessionMaxAgeSeconds ?? d.sessionMaxAgeSeconds,
      sessionAbsoluteMaxAgeSeconds: val.sessionAbsoluteMaxAgeSeconds ?? d.sessionAbsoluteMaxAgeSeconds,
      sessionRememberMaxAgeSeconds: val.sessionRememberMaxAgeSeconds ?? d.sessionRememberMaxAgeSeconds,
      registerEmailFilterMode: (val.registerEmailFilterMode === 'whitelist' || val.registerEmailFilterMode === 'blacklist')
        ? val.registerEmailFilterMode
        : 'off',
      registerEmailFilterList: val.registerEmailFilterList ?? d.registerEmailFilterList,
      emailVerifyExpiresInMinutes: val.emailVerifyExpiresInMinutes ?? d.emailVerifyExpiresInMinutes,
      passwordResetExpiresInMinutes: val.passwordResetExpiresInMinutes ?? d.passwordResetExpiresInMinutes,
      passwordResetEnabled: val.passwordResetEnabled ?? d.passwordResetEnabled,
      smtpHost: val.smtpHost || d.smtpHost,
      smtpPort: val.smtpPort ?? d.smtpPort,
      smtpSecure: val.smtpSecure ?? d.smtpSecure,
      smtpUser: val.smtpUser || d.smtpUser,
      smtpPass: val.smtpPass || d.smtpPass,
      smtpFrom: val.smtpFrom || d.smtpFrom,
      oauthLoginEnabled: val.oauthLoginEnabled ?? d.oauthLoginEnabled,
      oauthForceBinding: val.oauthForceBinding ?? d.oauthForceBinding,
      turnstileEnabled: val.turnstileEnabled ?? d.turnstileEnabled,
      turnstileSiteKey: val.turnstileSiteKey || d.turnstileSiteKey,
      turnstileSecretKey: val.turnstileSecretKey || d.turnstileSecretKey,
      turnstileLoginEnabled: val.turnstileLoginEnabled ?? d.turnstileLoginEnabled,
      turnstileRegisterEnabled: val.turnstileRegisterEnabled ?? d.turnstileRegisterEnabled,
      turnstileAdminLoginEnabled: val.turnstileAdminLoginEnabled ?? d.turnstileAdminLoginEnabled,
      turnstilePublicStatsEnabled: val.turnstilePublicStatsEnabled ?? d.turnstilePublicStatsEnabled,
      turnstilePasswordResetEnabled: val.turnstilePasswordResetEnabled ?? d.turnstilePasswordResetEnabled,
      announcementShowOnHome: val.announcementShowOnHome ?? d.announcementShowOnHome,
    } satisfies AdminSettingsForm)
  }, { immediate: true })

  async function save() {
    saving.value = true
    try {
      await $fetch('/api/admin/settings/update', { method: 'PUT', body: { ...form } })
      toast.add({ title: '保存成功', color: 'success' })
      await refresh()
    }
    catch (err) {
      toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '保存失败', color: 'error' })
    }
    finally {
      saving.value = false
    }
  }

  return { form, saving, status, save }
}
