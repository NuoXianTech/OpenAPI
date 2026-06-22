import { parseFetchError } from '#shared/utils/clientError'

export interface AdminSettingsForm {
  siteName: string
  siteUrl: string
  siteImg: string
  siteDescription: string
  startTime: string
  icpBeian: string
  policeBeian: string
  termsUrl: string
  privacyUrl: string
  sessionMaxAgeSeconds: number
  sessionAbsoluteMaxAgeSeconds: number
  sessionRememberMaxAgeSeconds: number
  registrationMode: 'open' | 'invite' | 'closed'
  registerEmailFilterMode: 'off' | 'whitelist' | 'blacklist'
  registerEmailFilterList: string
  defaultRegisterCredits: number
  emailVerifyExpiresInMinutes: number
  emailActivationEnabled: boolean
  passwordResetExpiresInMinutes: number
  passwordResetEnabled: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPass: string
  smtpFrom: string
  smtpFromName: string
  smtpReplyTo: string
  smtpPoolMaxAgeSeconds: number
  oauthForceBinding: boolean
  turnstileSiteKey: string
  turnstileSecretKey: string
  turnstileLoginEnabled: boolean
  turnstileRegisterEnabled: boolean
  turnstileAdminLoginEnabled: boolean
  turnstilePasswordResetEnabled: boolean
  turnstileCheckinEnabled: boolean
  checkinEnabled: boolean
  checkinCooldownMode: 'hours' | 'fixed_time'
  checkinRefreshHours: number
  checkinFixedRefreshTime: string
  checkinMode: 'fixed' | 'range'
  checkinAmountFixed: number
  checkinAmountMin: number
  checkinAmountMax: number
}

const writeOnlySecretKeys = ['smtpPass', 'turnstileSecretKey'] as const

function defaultForm(): AdminSettingsForm {
  return {
    siteName: '',
    siteUrl: '',
    siteImg: '',
    siteDescription: '',
    startTime: '',
    icpBeian: '',
    policeBeian: '',
    termsUrl: '',
    privacyUrl: '',
    sessionMaxAgeSeconds: 86400,
    sessionAbsoluteMaxAgeSeconds: 604800,
    sessionRememberMaxAgeSeconds: 2592000,
    registrationMode: 'open',
    registerEmailFilterMode: 'off',
    registerEmailFilterList: '',
    defaultRegisterCredits: 0,
    emailVerifyExpiresInMinutes: 30,
    emailActivationEnabled: true,
    passwordResetExpiresInMinutes: 30,
    passwordResetEnabled: true,
    smtpHost: '',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    smtpFromName: '',
    smtpReplyTo: '',
    smtpPoolMaxAgeSeconds: 0,
    oauthForceBinding: false,
    turnstileSiteKey: '',
    turnstileSecretKey: '',
    turnstileLoginEnabled: false,
    turnstileRegisterEnabled: false,
    turnstileAdminLoginEnabled: false,
    turnstilePasswordResetEnabled: false,
    checkinEnabled: true,
    turnstileCheckinEnabled: false,
    checkinCooldownMode: 'hours',
    checkinRefreshHours: 24,
    checkinFixedRefreshTime: '00:00',
    checkinMode: 'fixed',
    checkinAmountFixed: 10,
    checkinAmountMin: 5,
    checkinAmountMax: 20
  }
}

function normalizeForm(val: Partial<AdminSettingsForm>): AdminSettingsForm {
  const d = defaultForm()
  return {
    siteName: val.siteName || d.siteName,
    siteUrl: val.siteUrl || d.siteUrl,
    siteImg: val.siteImg || d.siteImg,
    siteDescription: val.siteDescription || d.siteDescription,
    startTime: val.startTime || d.startTime,
    icpBeian: val.icpBeian || d.icpBeian,
    policeBeian: val.policeBeian || d.policeBeian,
    termsUrl: val.termsUrl || d.termsUrl,
    privacyUrl: val.privacyUrl || d.privacyUrl,
    sessionMaxAgeSeconds: val.sessionMaxAgeSeconds ?? d.sessionMaxAgeSeconds,
    sessionAbsoluteMaxAgeSeconds: val.sessionAbsoluteMaxAgeSeconds ?? d.sessionAbsoluteMaxAgeSeconds,
    sessionRememberMaxAgeSeconds: val.sessionRememberMaxAgeSeconds ?? d.sessionRememberMaxAgeSeconds,
    registrationMode: (val.registrationMode === 'invite' || val.registrationMode === 'closed')
      ? val.registrationMode
      : 'open',
    registerEmailFilterMode: (val.registerEmailFilterMode === 'whitelist' || val.registerEmailFilterMode === 'blacklist')
      ? val.registerEmailFilterMode
      : 'off',
    registerEmailFilterList: val.registerEmailFilterList ?? d.registerEmailFilterList,
    defaultRegisterCredits: val.defaultRegisterCredits ?? d.defaultRegisterCredits,
    emailVerifyExpiresInMinutes: val.emailVerifyExpiresInMinutes ?? d.emailVerifyExpiresInMinutes,
    emailActivationEnabled: val.emailActivationEnabled ?? d.emailActivationEnabled,
    passwordResetExpiresInMinutes: val.passwordResetExpiresInMinutes ?? d.passwordResetExpiresInMinutes,
    passwordResetEnabled: val.passwordResetEnabled ?? d.passwordResetEnabled,
    smtpHost: val.smtpHost || d.smtpHost,
    smtpPort: val.smtpPort ?? d.smtpPort,
    smtpSecure: val.smtpSecure ?? d.smtpSecure,
    smtpUser: val.smtpUser || d.smtpUser,
    smtpPass: val.smtpPass || d.smtpPass,
    smtpFrom: val.smtpFrom || d.smtpFrom,
    smtpFromName: val.smtpFromName ?? d.smtpFromName,
    smtpReplyTo: val.smtpReplyTo ?? d.smtpReplyTo,
    smtpPoolMaxAgeSeconds: val.smtpPoolMaxAgeSeconds ?? d.smtpPoolMaxAgeSeconds,
    oauthForceBinding: val.oauthForceBinding ?? d.oauthForceBinding,
    turnstileSiteKey: val.turnstileSiteKey || d.turnstileSiteKey,
    turnstileSecretKey: val.turnstileSecretKey || d.turnstileSecretKey,
    turnstileLoginEnabled: val.turnstileLoginEnabled ?? d.turnstileLoginEnabled,
    turnstileRegisterEnabled: val.turnstileRegisterEnabled ?? d.turnstileRegisterEnabled,
    turnstileAdminLoginEnabled: val.turnstileAdminLoginEnabled ?? d.turnstileAdminLoginEnabled,
    turnstilePasswordResetEnabled: val.turnstilePasswordResetEnabled ?? d.turnstilePasswordResetEnabled,
    turnstileCheckinEnabled: val.turnstileCheckinEnabled ?? d.turnstileCheckinEnabled,
    checkinEnabled: val.checkinEnabled ?? d.checkinEnabled,
    checkinCooldownMode: val.checkinCooldownMode === 'fixed_time' ? 'fixed_time' : 'hours',
    checkinRefreshHours: val.checkinRefreshHours ?? d.checkinRefreshHours,
    checkinFixedRefreshTime: val.checkinFixedRefreshTime || d.checkinFixedRefreshTime,
    checkinMode: val.checkinMode === 'range' ? 'range' : 'fixed',
    checkinAmountFixed: val.checkinAmountFixed ?? d.checkinAmountFixed,
    checkinAmountMin: val.checkinAmountMin ?? d.checkinAmountMin,
    checkinAmountMax: val.checkinAmountMax ?? d.checkinAmountMax
  }
}

function snapshot(form: AdminSettingsForm): AdminSettingsForm {
  return { ...form }
}

export function useAdminSettingsPage() {
  const toast = useToast()

  const form = reactive<AdminSettingsForm>(defaultForm())
  const pristine = ref<AdminSettingsForm>(defaultForm())
  const saving = ref(false)
  const loading = ref(false)

  // 后台设置含只写 secret 状态，仍用 $fetch（仅客户端 onMounted 触发）拉取，
  // 避免管理端配置进入 SSR payload。
  async function load() {
    loading.value = true
    try {
      const val = await $fetch<Partial<AdminSettingsForm> | null>('/api/admin/settings/get')
      if (!val) return
      const next = normalizeForm(val)
      Object.assign(form, next)
      pristine.value = snapshot(next)
    } catch (err) {
      console.error('failed to load admin settings', err)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void load()
  })

  const changedKeys = computed(() => {
    const keys: Array<keyof AdminSettingsForm> = []
    for (const k of Object.keys(pristine.value) as Array<keyof AdminSettingsForm>) {
      if (form[k] !== pristine.value[k]) keys.push(k)
    }
    return keys
  })

  const dirty = computed(() => changedKeys.value.length > 0)

  function reset() {
    Object.assign(form, pristine.value)
  }

  async function save() {
    if (!dirty.value || saving.value) return
    saving.value = true
    try {
      const body = changedKeys.value.reduce<Partial<AdminSettingsForm>>((accumulator, key) => {
        const isEmptyWriteOnlySecret = writeOnlySecretKeys.includes(key as typeof writeOnlySecretKeys[number])
          && !String(form[key] ?? '').trim()
        if (!isEmptyWriteOnlySecret) {
          accumulator[key] = form[key] as never
        }
        return accumulator
      }, {})
      const res = await $fetch<{ public: PublicSiteSettings }>('/api/admin/settings/update', { method: 'PUT', body })
      // 用 update 接口返回的 public shape 原地刷新全站 useSiteSettings() 缓存，省一次 GET。
      const cached = useNuxtData<PublicSiteSettings>(PUBLIC_SITE_SETTINGS_KEY)
      cached.data.value = res.public
      // 先把 pristine 推到当前值，避免 load 期间 dirty 仍然为 true 导致 sticky bar 闪烁。
      pristine.value = snapshot(form)
      toast.add({ title: '保存成功', color: 'success' })
      await load()
    } catch (err) {
      toast.add({ title: parseFetchError(err, '保存失败'), color: 'error' })
    } finally {
      saving.value = false
    }
  }

  return { form, saving, loading, save, dirty, changedKeys, reset }
}
