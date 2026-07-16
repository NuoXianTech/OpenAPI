import type { ComputedRef, Ref } from 'vue'
import { SUPPORTED_OAUTH_PROVIDERS } from '#shared/types/oauth'
import { parseFetchError } from '~/utils/client-error'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

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

export type AdminSettingsKey = keyof AdminSettingsForm

export interface AdminSettingsSectionState {
  dirty: ComputedRef<boolean>
  changedCount: ComputedRef<number>
  saving: ComputedRef<boolean>
  disabled: ComputedRef<boolean>
  save: () => Promise<void>
  reset: () => void
}

interface AdminOauthProviderItem {
  provider: string
  displayName: string
  icon: string
  scopes: string[]
  clientId: string
  clientSecret: string
  isEnabled: boolean
  callbackUrl: string
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl: string
}

interface AdminOauthProviderForm {
  clientId: string
  clientSecret: string
  isEnabled: boolean
  copied: boolean
  secretVisible: boolean
  open: boolean
}

interface AdminOauthProviderUpdateBody {
  provider: string
  clientId: string
  isEnabled: boolean
  clientSecret?: string
}

interface AdminOauthSettingsUpdateBody {
  oauthForceBinding: boolean
  providers: AdminOauthProviderUpdateBody[]
}

interface AdminUserSessionSettingsState {
  form: AdminSettingsForm
  saving: Ref<boolean>
  save: (keys?: readonly AdminSettingsKey[]) => void | Promise<void>
  dirty: ComputedRef<boolean>
  changedKeys: ComputedRef<AdminSettingsKey[]>
  reset: (keys?: readonly AdminSettingsKey[]) => void
  commit: (keys: readonly AdminSettingsKey[]) => void
  createSection: (keys: readonly AdminSettingsKey[]) => AdminSettingsSectionState
}

interface AdminOauthProviderFetchState {
  data: Ref<AdminOauthProviderItem[]>
  loading: Ref<boolean>
  refresh: () => Promise<void>
}

interface AdminUserSessionToast {
  add: (toast: { title: string, color: 'success' | 'error' }) => void
}

interface UseAdminUserSessionSettingsOptions {
  supportedProviders?: readonly string[]
  useSettingsPage?: () => AdminUserSessionSettingsState
  useProviderFetch?: () => AdminOauthProviderFetchState
  updateOauthSettings?: (body: AdminOauthSettingsUpdateBody) => Promise<void>
  copyText?: (text: string) => Promise<void>
  toast?: AdminUserSessionToast
  scheduleCopiedReset?: (callback: () => void) => void
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
  const savingKeys = ref<readonly AdminSettingsKey[]>([])
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
    } catch {
      // 保持当前表单值，避免失败请求覆盖用户正在编辑的内容。
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

  function getChangedKeys(keys?: readonly AdminSettingsKey[]): AdminSettingsKey[] {
    if (!keys) return changedKeys.value
    return keys.filter(key => form[key] !== pristine.value[key])
  }

  function reset(keys?: readonly AdminSettingsKey[]) {
    const keysToReset = keys ?? changedKeys.value
    for (const key of keysToReset) {
      form[key] = pristine.value[key] as never
    }
  }

  function commit(keys: readonly AdminSettingsKey[]): void {
    const nextPristine = snapshot(pristine.value)
    for (const key of keys) {
      nextPristine[key] = form[key] as never
    }
    pristine.value = nextPristine
  }

  async function save(keys?: readonly AdminSettingsKey[]) {
    const keysToSave = getChangedKeys(keys)
    if (!keysToSave.length || saving.value) return
    saving.value = true
    savingKeys.value = keysToSave
    try {
      const body = keysToSave.reduce<Partial<AdminSettingsForm>>((accumulator, key) => {
        const isEmptyWriteOnlySecret = writeOnlySecretKeys.includes(key as typeof writeOnlySecretKeys[number])
          && !String(form[key] ?? '').trim()
        if (!isEmptyWriteOnlySecret) {
          accumulator[key] = form[key] as never
        }
        return accumulator
      }, {})
      const res = await $fetch<Partial<AdminSettingsForm> & { public: PublicSiteSettings }>('/api/admin/settings/update', { method: 'PUT', body })
      // 用 update 接口返回的 public shape 原地刷新全站 useSiteSettings() 缓存，省一次 GET。
      const cached = useNuxtData<PublicSiteSettings>(PUBLIC_SITE_SETTINGS_KEY)
      cached.data.value = res.public

      const normalizedResponse = normalizeForm(res)
      const nextPristine = snapshot(pristine.value)
      for (const key of keysToSave) {
        const isWriteOnlySecret = writeOnlySecretKeys.includes(key as typeof writeOnlySecretKeys[number])
        const savedValue = isWriteOnlySecret ? '' : normalizedResponse[key]
        form[key] = savedValue as never
        nextPristine[key] = savedValue as never
      }
      pristine.value = nextPristine
      toast.add({ title: '保存成功', color: 'success' })
    } catch (err) {
      toast.add({ title: parseFetchError(err, '保存失败'), color: 'error' })
    } finally {
      saving.value = false
      savingKeys.value = []
    }
  }

  function createSection(keys: readonly AdminSettingsKey[]): AdminSettingsSectionState {
    const sectionChangedKeys = computed(() => getChangedKeys(keys))
    const isSectionSaving = computed(() => saving.value && savingKeys.value.some(key => keys.includes(key)))

    return {
      dirty: computed(() => sectionChangedKeys.value.length > 0),
      changedCount: computed(() => sectionChangedKeys.value.length),
      saving: isSectionSaving,
      disabled: computed(() => saving.value && !isSectionSaving.value),
      save: async () => save(keys),
      reset: () => reset(keys)
    }
  }

  return { form, saving, loading, save, dirty, changedKeys, reset, commit, createSection }
}

const ADMIN_USER_SESSION_EMAIL_FILTER_MODE_ITEMS = [
  { label: '不开启', value: 'off' },
  { label: '白名单', value: 'whitelist' },
  { label: '黑名单', value: 'blacklist' }
]

function createAdminOauthProviderForm(): AdminOauthProviderForm {
  return {
    clientId: '',
    clientSecret: '',
    isEnabled: false,
    copied: false,
    secretVisible: false,
    open: false
  }
}

function getAdminOauthProviderForm(
  forms: Record<string, AdminOauthProviderForm>,
  provider: string
): AdminOauthProviderForm {
  let providerForm = forms[provider]
  if (!providerForm) {
    providerForm = createAdminOauthProviderForm()
    forms[provider] = providerForm
  }
  return providerForm
}

function syncAdminOauthProviderFormsFromItems(
  forms: Record<string, AdminOauthProviderForm>,
  items: AdminOauthProviderItem[]
): void {
  for (const item of items) {
    const providerForm = getAdminOauthProviderForm(forms, item.provider)
    providerForm.clientId = item.clientId || ''
    providerForm.clientSecret = ''
    providerForm.isEnabled = item.isEnabled
  }
}

function buildAdminOauthProviderUpdateBody(
  provider: string,
  providerForm: AdminOauthProviderForm
): AdminOauthProviderUpdateBody {
  const body: AdminOauthProviderUpdateBody = {
    provider,
    clientId: providerForm.clientId,
    isEnabled: providerForm.isEnabled
  }

  if (providerForm.clientSecret) {
    body.clientSecret = providerForm.clientSecret
  }

  return body
}

function useDefaultProviderFetch(): AdminOauthProviderFetchState {
  const result = usePrivateResource<AdminOauthProviderItem[]>({
    path: '/api/admin/oauth-providers/list',
    defaultData: () => []
  })

  return {
    data: result.data,
    loading: result.loading,
    refresh: async () => {
      await result.refresh()
    }
  }
}

async function updateDefaultOauthSettings(body: AdminOauthSettingsUpdateBody): Promise<void> {
  await $fetch('/api/admin/oauth-providers/update-all', { method: 'PUT', body })
}

async function copyDefaultText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

function scheduleDefaultCopiedReset(callback: () => void): void {
  setTimeout(callback, 1500)
}

export function useAdminUserSessionSettings(options: UseAdminUserSessionSettingsOptions = {}) {
  const toast = options.toast ?? useToast()
  const settings = options.useSettingsPage?.() ?? useAdminSettingsPage()
  const providerFetch = options.useProviderFetch?.() ?? useDefaultProviderFetch()
  const updateOauthSettings = options.updateOauthSettings ?? updateDefaultOauthSettings
  const copyText = options.copyText ?? copyDefaultText
  const scheduleCopiedReset = options.scheduleCopiedReset ?? scheduleDefaultCopiedReset
  const supportedProviders = options.supportedProviders ?? SUPPORTED_OAUTH_PROVIDERS
  const forms = reactive<Record<string, AdminOauthProviderForm>>(
    Object.fromEntries(supportedProviders.map(provider => [provider, createAdminOauthProviderForm()]))
  )
  const items = computed<AdminOauthProviderItem[]>(() => providerFetch.data.value)
  const oauthPolicyKeys = ['oauthForceBinding'] as const satisfies readonly AdminSettingsKey[]
  const oauthPolicySection = settings.createSection(oauthPolicyKeys)
  const isOauthSaving = ref(false)
  const allowRegistration = computed({
    get: () => settings.form.registrationMode !== 'closed',
    set: (value: boolean) => {
      settings.form.registrationMode = value ? 'open' : 'closed'
    }
  })

  watch(items, (list) => {
    syncAdminOauthProviderFormsFromItems(forms, list)
  }, { immediate: true })

  function getForm(provider: string): AdminOauthProviderForm {
    return getAdminOauthProviderForm(forms, provider)
  }

  const changedProviderCount = computed(() => items.value.filter((item) => {
    const providerForm = getForm(item.provider)
    return providerForm.clientId !== item.clientId
      || providerForm.clientSecret.length > 0
      || providerForm.isEnabled !== item.isEnabled
  }).length)
  const oauthChangedCount = computed(() => changedProviderCount.value + oauthPolicySection.changedCount.value)
  const isOauthDirty = computed(() => oauthChangedCount.value > 0)
  const isOauthReady = computed(() => !providerFetch.loading.value && items.value.length === supportedProviders.length)

  async function saveOauthSettings(): Promise<void> {
    if (!isOauthReady.value || !isOauthDirty.value || isOauthSaving.value) return
    isOauthSaving.value = true
    try {
      await updateOauthSettings({
        oauthForceBinding: settings.form.oauthForceBinding,
        providers: items.value.map(item => buildAdminOauthProviderUpdateBody(item.provider, getForm(item.provider)))
      })
      settings.commit(oauthPolicyKeys)
      for (const item of items.value) {
        getForm(item.provider).clientSecret = ''
      }
      await providerFetch.refresh()
      toast.add({ title: '第三方登录设置保存成功', color: 'success' })
    } catch (err: unknown) {
      toast.add({ title: parseFetchError(err, '第三方登录设置保存失败'), color: 'error' })
    } finally {
      isOauthSaving.value = false
    }
  }

  async function copyCallback(item: AdminOauthProviderItem): Promise<void> {
    const providerForm = getForm(item.provider)
    try {
      await copyText(item.callbackUrl)
      providerForm.copied = true
      scheduleCopiedReset(() => {
        providerForm.copied = false
      })
    } catch {
      toast.add({ title: '复制失败，请手动选中复制', color: 'error' })
    }
  }

  return {
    form: settings.form,
    saving: settings.saving,
    save: settings.save,
    dirty: settings.dirty,
    changedKeys: settings.changedKeys,
    reset: settings.reset,
    createSection: settings.createSection,
    allowRegistration,
    emailFilterModeItems: ADMIN_USER_SESSION_EMAIL_FILTER_MODE_ITEMS,
    loading: providerFetch.loading,
    refresh: providerFetch.refresh,
    items,
    forms,
    getForm,
    isOauthDirty,
    isOauthReady,
    oauthChangedCount,
    isOauthSaving,
    saveOauthSettings,
    copyCallback
  }
}
