import { INITIAL_ADMIN_PROFILE, needsInitialAdminProfileSetup } from '#shared/config/admin-defaults'
import { parseFetchError } from '~/utils/client-error'

interface AdminInitialProfileForm {
  username: string
  email: string
}

function defaultForm(): AdminInitialProfileForm {
  return {
    username: '',
    email: ''
  }
}

function canSaveProfile(form: AdminInitialProfileForm): boolean {
  return form.username.trim().length > 0 && form.email.trim().length > 0
}

export function useAdminInitialProfile() {
  const toast = useToast()
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

    if (checkedUserId.value === value.id) return
    checkedUserId.value = value.id
    checking.value = true
    try {
      const status = await $fetch<{ shouldShow: boolean }>('/api/admin/onboarding/status')
      open.value = status.shouldShow
    } catch {
      open.value = false
    } finally {
      checking.value = false
    }
  }, { immediate: true })

  const canSubmit = computed(() => canSaveProfile(form) && !saving.value && !checking.value)

  async function submit() {
    if (!canSubmit.value) return

    saving.value = true
    errorMessage.value = ''
    try {
      await $fetch('/api/admin/onboarding/profile', {
        method: 'PUT',
        body: {
          username: form.username.trim(),
          email: form.email.trim().toLowerCase()
        }
      })
      await fetchMe(true)
      open.value = false
      toast.add({ title: '管理员资料已更新', color: 'success' })
    } catch (error: unknown) {
      errorMessage.value = parseFetchError(error, '保存失败')
    } finally {
      saving.value = false
    }
  }

  async function dismiss() {
    if (saving.value || checking.value) return

    saving.value = true
    errorMessage.value = ''
    try {
      await $fetch('/api/admin/onboarding/seen', { method: 'POST' })
      open.value = false
    } catch (error: unknown) {
      errorMessage.value = parseFetchError(error, '关闭失败')
    } finally {
      saving.value = false
    }
  }

  function handleOpenChange(value: boolean) {
    if (value) {
      open.value = true
      return
    }

    void dismiss()
  }

  return {
    open,
    form,
    saving,
    errorMessage,
    canSubmit,
    submit,
    dismiss,
    handleOpenChange
  }
}
