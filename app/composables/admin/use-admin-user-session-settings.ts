import { SUPPORTED_OAUTH_PROVIDERS } from '#shared/types/oauth'
import type { AdminSettingsKey } from '~/composables/admin/use-admin-settings-page'
import { useAdminSettingsPage } from '~/composables/admin/use-admin-settings-page'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import { parseFetchError } from '~/utils/client-error'

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
  secretVisible: boolean
  open: boolean
}

interface AdminOauthProviderUpdateBody {
  provider: string
  clientId: string
  isEnabled: boolean
  clientSecret?: string
}

function createProviderForm(): AdminOauthProviderForm {
  return {
    clientId: '',
    clientSecret: '',
    isEnabled: false,
    secretVisible: false,
    open: false
  }
}

function buildProviderUpdate(
  provider: string,
  form: AdminOauthProviderForm
): AdminOauthProviderUpdateBody {
  return {
    provider,
    clientId: form.clientId,
    isEnabled: form.isEnabled,
    ...(form.clientSecret ? { clientSecret: form.clientSecret } : {})
  }
}

export function useAdminUserSessionSettings() {
  const toast = useToast()
  const { t } = useI18n()
  const { copyText } = useCopyFeedback()
  const settings = useAdminSettingsPage()
  const providers = usePrivateResource<AdminOauthProviderItem[]>({
    path: '/api/admin/oauth-providers/list',
    defaultData: () => []
  })
  const forms = reactive<Record<string, AdminOauthProviderForm>>(
    Object.fromEntries(SUPPORTED_OAUTH_PROVIDERS.map(provider => [provider, createProviderForm()]))
  )
  const items = computed(() => providers.data.value)
  const oauthPolicyKeys = ['oauthForceBinding'] as const satisfies readonly AdminSettingsKey[]
  const oauthPolicySection = settings.createSection(oauthPolicyKeys)
  const isOauthSaving = ref(false)

  const registrationModeItems = computed(() => [
    { label: t('admin.system.session.registration.mode.options.open'), value: 'open' },
    { label: t('admin.system.session.registration.mode.options.invite'), value: 'invite' },
    { label: t('admin.system.session.registration.mode.options.closed'), value: 'closed' }
  ])
  const emailFilterModeItems = computed(() => [
    { label: t('admin.system.session.emailFilter.options.off'), value: 'off' },
    { label: t('admin.system.session.emailFilter.options.whitelist'), value: 'whitelist' },
    { label: t('admin.system.session.emailFilter.options.blacklist'), value: 'blacklist' }
  ])

  function getForm(provider: string): AdminOauthProviderForm {
    return forms[provider] ?? (forms[provider] = createProviderForm())
  }

  watch(items, (list) => {
    for (const item of list) {
      Object.assign(getForm(item.provider), {
        clientId: item.clientId || '',
        clientSecret: '',
        isEnabled: item.isEnabled
      })
    }
  }, { immediate: true })

  const changedProviderCount = computed(() => items.value.filter((item) => {
    const form = getForm(item.provider)
    return form.clientId !== item.clientId
      || form.clientSecret.length > 0
      || form.isEnabled !== item.isEnabled
  }).length)
  const oauthChangedCount = computed(() => changedProviderCount.value + oauthPolicySection.changedCount.value)
  const isOauthDirty = computed(() => oauthChangedCount.value > 0)
  const isOauthReady = computed(() => !providers.loading.value && items.value.length === SUPPORTED_OAUTH_PROVIDERS.length)

  async function saveOauthSettings(): Promise<void> {
    if (!isOauthReady.value || !isOauthDirty.value || isOauthSaving.value) return
    isOauthSaving.value = true
    try {
      await $fetch('/api/admin/oauth-providers/update-all', {
        method: 'PUT',
        body: {
          oauthForceBinding: settings.form.oauthForceBinding,
          providers: items.value.map(item => buildProviderUpdate(item.provider, getForm(item.provider)))
        }
      })
      settings.commit(oauthPolicyKeys)
      await providers.refresh()
      toast.add({ title: t('admin.system.session.oauth.feedback.saved'), color: 'success' })
    } catch (error) {
      toast.add({
        title: parseFetchError(error, t('admin.system.session.oauth.feedback.saveFailed')),
        color: 'error'
      })
    } finally {
      isOauthSaving.value = false
    }
  }

  async function copyCallback(item: AdminOauthProviderItem): Promise<void> {
    await copyText(item.callbackUrl, {
      errorTitle: t('admin.system.session.oauth.feedback.copyFailed')
    })
  }

  return {
    form: settings.form,
    secrets: settings.secrets,
    saving: settings.saving,
    save: settings.save,
    dirty: settings.dirty,
    changedKeys: settings.changedKeys,
    reset: settings.reset,
    createSection: settings.createSection,
    registrationModeItems,
    emailFilterModeItems,
    loading: providers.loading,
    refresh: providers.refresh,
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
