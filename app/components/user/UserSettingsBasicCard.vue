<script setup lang="ts">
import type { ProfileData } from '~/composables/user/use-user-settings-page'
import { parseFetchError } from '~/utils/client-error'

interface UserSettingsBasicCardProps {
  profile: ProfileData | null
  profileLoading: boolean
  avatarUrl?: string | null
  onSave: (displayName: string) => Promise<void>
}

const props = defineProps<UserSettingsBasicCardProps>()

const toast = useToast()
const { t } = useI18n()
const isSaving = ref(false)
const displayName = ref('')
const avatarAlt = computed(() => props.profile?.displayName || props.profile?.username || t('user.settings.profile.avatarAlt'))

watch(() => props.profile, (val) => {
  if (val) displayName.value = val.displayName || ''
}, { immediate: true })

async function submit() {
  isSaving.value = true
  try {
    await props.onSave(displayName.value)
  } catch (err) {
    toast.add({ title: parseFetchError(err, t('common.feedback.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <DashboardSettingsSection
    :title="$t('user.settings.profile.title')"
  >
    <div
      v-if="profileLoading && !profile"
      class="text-sm text-muted py-4 text-center"
    >
      {{ $t('common.states.loading') }}
    </div>
    <template v-else>
      <UFormField
        :label="$t('user.settings.profile.avatar')"
        :description="$t('user.settings.profile.avatarDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UAvatar
          :src="avatarUrl || undefined"
          :alt="avatarAlt"
          class="size-16 border border-default bg-elevated"
        />
      </UFormField>
      <UFormField
        :label="$t('user.settings.profile.username')"
        :description="$t('user.settings.profile.usernameDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          :model-value="profile?.username || ''"
          disabled
          class="w-full sm:w-60"
        />
      </UFormField>
      <UFormField
        :label="$t('user.settings.profile.displayName')"
        :description="$t('user.settings.profile.displayNameDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="displayName"
          :maxlength="32"
          class="w-full sm:w-60"
        />
      </UFormField>
      <div class="flex justify-end pt-4">
        <UButton
          :loading="isSaving"
          icon="i-mdi-content-save-outline"
          @click="submit"
        >
          {{ $t('user.settings.profile.save') }}
        </UButton>
      </div>
    </template>
  </DashboardSettingsSection>
</template>
