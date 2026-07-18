import type { LoginLogRow } from '#shared/types/login-log'

export function useUserSecuritySettings() {
  const toast = useToast()
  const { t } = useI18n()

  const loginActivity = ref<LoginLogRow[]>([])
  const isLoginActivityLoading = ref(false)

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
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

  async function loadLoginActivity(): Promise<void> {
    isLoginActivityLoading.value = true
    try {
      const response = await $fetch<{ items: LoginLogRow[], total: number }>('/api/user/login-logs/list')
      loginActivity.value = response?.items || []
    } catch {
      loginActivity.value = []
    } finally {
      isLoginActivityLoading.value = false
    }
  }

  return {
    loginActivity,
    isLoginActivityLoading,
    changePassword,
    loadLoginActivity
  }
}
