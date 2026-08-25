import { INITIAL_ADMIN_PROFILE, needsInitialAdminProfileSetup } from '#shared/config/admin-defaults'
import { parseFetchError } from '~/utils/client-error'

interface AdminInitialProfileForm {
  username: string
  email: string
  password: string
  confirmPassword: string
}

function defaultForm(): AdminInitialProfileForm {
  return {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  }
}

function canSaveProfile(form: AdminInitialProfileForm): boolean {
  return form.username.trim().length > 0
    && form.email.trim().length > 0
    && form.password.length >= 8
    && form.password === form.confirmPassword
}

export function useAdminInitialProfile() {
  const toast = useToast()
  const { t } = useI18n()
  const { user, fetchMe } = useAuth()
  const open = ref(false)
  const saving = ref(false)
  const checking = ref(false)
  const errorMessage = ref('')
  const checkedUserId = ref<number | null>(null)
  const form = reactive<AdminInitialProfileForm>(defaultForm())

  watch(user, async (value) => {
    if (!value || value.role !== 'admin') {
      open.value = false
      checkedUserId.value = null
      return
    }

    if (!needsInitialAdminProfileSetup(value)) {
      open.value = false
      return
    }

    form.username = value.username || INITIAL_ADMIN_PROFILE.username
    form.email = value.email || INITIAL_ADMIN_PROFILE.email
    form.password = ''
    form.confirmPassword = ''

    if (checkedUserId.value === value.id) return
    checkedUserId.value = value.id
    checking.value = true
    try {
      const status = await $fetch('/api/admin/onboarding/status')
      open.value = status.shouldShow
    } catch {
      open.value = false
    } finally {
      checking.value = false
    }
  }, { immediate: true })

  const canSubmit = computed(() => canSaveProfile(form) && !saving.value && !checking.value)

  async function submit(): Promise<void> {
    if (!canSubmit.value) return

    saving.value = true
    errorMessage.value = ''
    try {
      await $fetch('/api/admin/onboarding/profile', {
        method: 'PUT',
        body: {
          username: form.username.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password
        }
      })
      await fetchMe(true)
      open.value = false
      toast.add({ title: t('admin.initialProfile.feedback.updated'), color: 'success' })
    } catch (error: unknown) {
      errorMessage.value = parseFetchError(error, t('admin.initialProfile.feedback.saveFailed'))
    } finally {
      saving.value = false
    }
  }

  return {
    open,
    form,
    saving,
    errorMessage,
    canSubmit,
    submit
  }
}
