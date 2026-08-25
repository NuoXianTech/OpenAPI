import { INITIAL_ADMIN_PROFILE } from '#shared/config/admin-defaults'
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

// 用户名与邮箱可以保持默认，因此只校验密码；留空的身份字段由服务端沿用当前值。
function canSaveProfile(form: AdminInitialProfileForm): boolean {
  return form.password.length >= 8
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

    // 预填当前身份（默认值也一并填上），用户不改就原样提交、服务端沿用当前值。
    form.username = value.username || INITIAL_ADMIN_PROFILE.username
    form.email = value.email || INITIAL_ADMIN_PROFILE.email
    form.password = ''
    form.confirmPassword = ''

    // 完成判据是「初始口令是否已轮换」，这个状态不在客户端可见的 AuthUser 里，
    // 因此只能问服务端；不能再用「身份是否仍是默认值」短路——保持默认身份的
    // 管理员在引导完成后那个判断仍然为 true。每个会话问一次，由 checkedUserId 去重。
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
