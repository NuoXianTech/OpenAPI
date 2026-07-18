<script setup lang="ts">
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from '#shared/config/locale-defaults'
import type { UserProfileData } from '~/types/user-settings'
import { parseFetchError } from '~/utils/client-error'

interface UserSettingsLanguageSectionProps {
  profile: UserProfileData | null
  profileLoading: boolean
  onSave: (locale: SupportedLocale) => Promise<void>
}

interface LanguageOption {
  label: string
  value: SupportedLocale
}

const props = defineProps<UserSettingsLanguageSectionProps>()
const { locale, locales, t } = useI18n()
const toast = useToast()
const isSaving = ref(false)
const selectedLocale = ref<SupportedLocale>(DEFAULT_LOCALE)

const languageOptions = computed<LanguageOption[]>(() => locales.value.flatMap((item) => {
  const code = typeof item === 'string' ? item : item.code
  if (!isSupportedLocale(code)) return []
  return [{
    label: typeof item === 'string' ? item : item.name || item.code,
    value: code
  }]
}))

const savedLocale = computed<SupportedLocale>(() => {
  if (isSupportedLocale(props.profile?.locale)) return props.profile.locale
  return isSupportedLocale(locale.value) ? locale.value : DEFAULT_LOCALE
})
const hasChanges = computed(() => selectedLocale.value !== savedLocale.value)

watch(() => props.profile, () => {
  selectedLocale.value = savedLocale.value
}, { immediate: true })

async function submit(): Promise<void> {
  if (!hasChanges.value) return

  isSaving.value = true
  try {
    await props.onSave(selectedLocale.value)
  } catch (error) {
    toast.add({
      title: parseFetchError(error, t('common.feedback.saveFailed')),
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <DashboardSettingsSection
    :title="$t('user.settings.language.title')"
  >
    <UFormField
      name="locale"
      :label="$t('user.settings.language.label')"
      :description="$t('user.settings.language.fieldDescription')"
      class="flex max-sm:flex-col items-start justify-between gap-4"
    >
      <USelect
        v-model="selectedLocale"
        :items="languageOptions"
        :loading="profileLoading"
        :disabled="profileLoading || !profile"
        icon="i-mdi-translate"
        class="w-full sm:min-w-60"
      />
    </UFormField>

    <div class="flex justify-end pt-4">
      <UButton
        icon="i-mdi-content-save-outline"
        :loading="isSaving"
        :disabled="!hasChanges || profileLoading || !profile"
        @click="submit"
      >
        {{ $t('common.actions.save') }}
      </UButton>
    </div>
  </DashboardSettingsSection>
</template>
