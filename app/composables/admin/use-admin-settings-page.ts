import type { ComputedRef } from 'vue'
import type { SystemSettings } from '#shared/types/site-settings'
import { SITE_SETTINGS_DEFAULTS } from '#shared/config/site-defaults'
import { parseFetchError } from '~/utils/client-error'

export type AdminSettingsForm = SystemSettings

export type AdminSettingsKey = keyof AdminSettingsForm

export interface AdminSettingsSecrets {
  hasRegistrationInviteCode: boolean
  hasSmtpPass: boolean
  hasOauthGithubClientSecret: boolean
  hasOauthQqClientSecret: boolean
  hasTurnstileSecretKey: boolean
}

export interface AdminSettingsSectionState {
  dirty: ComputedRef<boolean>
  changedCount: ComputedRef<number>
  saving: ComputedRef<boolean>
  disabled: ComputedRef<boolean>
  save: () => Promise<void>
  reset: () => void
}

interface AdminSettingsResponse extends Partial<AdminSettingsForm> {
  secrets?: Partial<AdminSettingsSecrets>
}

const writeOnlySecretKeys = [
  'registrationInviteCode',
  'smtpPass',
  'turnstileSecretKey'
] as const

const EMPTY_SETTINGS_SECRETS: AdminSettingsSecrets = {
  hasRegistrationInviteCode: false,
  hasSmtpPass: false,
  hasOauthGithubClientSecret: false,
  hasOauthQqClientSecret: false,
  hasTurnstileSecretKey: false
}

function defaultForm(): AdminSettingsForm {
  return { ...SITE_SETTINGS_DEFAULTS }
}

function normalizeForm(val: Partial<AdminSettingsForm>): AdminSettingsForm {
  const normalized = defaultForm()
  for (const key of Object.keys(normalized) as AdminSettingsKey[]) {
    const value = val[key]
    if (value !== undefined && value !== null) {
      normalized[key] = value as never
    }
  }
  return normalized
}

function snapshot(form: AdminSettingsForm): AdminSettingsForm {
  return { ...form }
}

export function useAdminSettingsPage() {
  const toast = useToast()
  const { t } = useI18n()

  const form = reactive<AdminSettingsForm>(defaultForm())
  const pristine = ref<AdminSettingsForm>(defaultForm())
  const secrets = reactive<AdminSettingsSecrets>({ ...EMPTY_SETTINGS_SECRETS })
  const saving = ref(false)
  const savingKeys = ref<readonly AdminSettingsKey[]>([])
  const loading = ref(false)

  // 后台设置含只写 secret 状态，仍用 $fetch（仅客户端 onMounted 触发）拉取，
  // 避免管理端配置进入 SSR payload。
  async function load() {
    loading.value = true
    try {
      const val = await $fetch<AdminSettingsResponse | null>('/api/admin/settings/get')
      if (!val) return
      const next = normalizeForm(val)
      Object.assign(form, next)
      pristine.value = snapshot(next)
      if (val.secrets) Object.assign(secrets, val.secrets)
    } catch (err) {
      // 保持当前表单值，避免失败请求覆盖用户正在编辑的内容。
      toast.add({ title: parseFetchError(err, t('admin.system.feedback.loadFailed')), color: 'error' })
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
      const res = await $fetch<AdminSettingsResponse & { public: PublicSiteSettings }>('/api/admin/settings/update', { method: 'PUT', body })
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
      if (res.secrets) Object.assign(secrets, res.secrets)
      toast.add({ title: t('admin.system.feedback.saved'), color: 'success' })
    } catch (err) {
      toast.add({ title: parseFetchError(err, t('admin.system.feedback.saveFailed')), color: 'error' })
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

  return { form, secrets, saving, loading, save, dirty, changedKeys, reset, commit, createSection }
}
