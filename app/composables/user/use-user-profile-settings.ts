import { isSupportedLocale, type SupportedLocale } from '#shared/config/locale-defaults'
import type { UserProfileData } from '~/types/user-settings'

export function useUserProfileSettings() {
  const toast = useToast()
  const { t, locale, setLocale } = useI18n()
  const { fetchMe, updateLocalePreference } = useAuth()

  const profile = ref<UserProfileData | null>(null)
  const isProfileLoading = ref(false)

  async function loadProfile(): Promise<void> {
    isProfileLoading.value = true
    try {
      profile.value = await $fetch<UserProfileData>('/api/user/profile')
    } catch {
      profile.value = null
    } finally {
      isProfileLoading.value = false
    }
  }

  async function updateProfile(displayName: string): Promise<void> {
    await $fetch('/api/user/profile', {
      method: 'PUT',
      body: { displayName: displayName.trim() }
    })
    toast.add({ title: t('user.settings.profile.updated'), color: 'success' })
    await Promise.all([loadProfile(), fetchMe(true)])
  }

  async function updateLanguagePreference(nextLocale: SupportedLocale): Promise<void> {
    const previousLocale = locale.value
    await setLocale(nextLocale)
    try {
      const savedLocale = await updateLocalePreference(nextLocale)
      if (profile.value) {
        profile.value = { ...profile.value, locale: savedLocale }
      }
      toast.add({ title: t('user.settings.language.updated'), color: 'success' })
    } catch (error) {
      if (isSupportedLocale(previousLocale)) {
        await setLocale(previousLocale)
      }
      throw error
    }
  }

  async function requestEmailChange(currentPassword: string, newEmail: string): Promise<string> {
    const response = await $fetch<{ pendingEmail: string }>('/api/user/request-email-change', {
      method: 'POST',
      body: { currentPassword, newEmail }
    })
    toast.add({
      title: t('user.settings.email.verificationSent'),
      description: t('user.settings.email.verificationSentDescription', { email: response.pendingEmail }),
      color: 'success'
    })
    return response.pendingEmail
  }

  return {
    profile,
    isProfileLoading,
    loadProfile,
    updateProfile,
    updateLanguagePreference,
    requestEmailChange
  }
}
