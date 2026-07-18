<script setup lang="ts">
import type { ProfileData } from '~/composables/user/use-user-settings-page'
import { parseFetchError } from '~/utils/client-error'

const props = defineProps<{
  profile: ProfileData | null
  onRequestChange: (currentPassword: string, newEmail: string) => Promise<string>
}>()

const toast = useToast()
const { t } = useI18n()
const newEmail = ref('')
const currentPassword = ref('')
const isSaving = ref(false)
const pending = ref<string | null>(null)

async function submit() {
  const v = newEmail.value.trim().toLowerCase()
  if (!v) {
    toast.add({ title: t('user.settings.email.enterNewEmail'), color: 'warning' })
    return
  }
  if (!currentPassword.value) {
    toast.add({ title: t('user.settings.security.enterCurrentPassword'), color: 'warning' })
    return
  }
  if (v === (props.profile?.email || '').toLowerCase()) {
    toast.add({ title: t('user.settings.email.sameAsCurrent'), color: 'warning' })
    return
  }
  isSaving.value = true
  try {
    pending.value = await props.onRequestChange(currentPassword.value, v)
    newEmail.value = ''
    currentPassword.value = ''
  } catch (err) {
    toast.add({ title: parseFetchError(err, t('common.feedback.sendFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="dashboard-settings-page">
    <DashboardSettingsSection
      :title="$t('user.settings.email.title')"
    >
      <UFormField
        :label="$t('user.settings.email.currentEmail')"
        :description="$t('user.settings.email.currentEmailDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <div class="flex min-w-0 max-w-full items-center gap-2 sm:max-w-80">
          <span class="truncate font-mono text-sm">{{ profile?.email }}</span>
          <UBadge
            v-if="profile?.emailVerifiedAt"
            color="success"
            variant="subtle"
            size="sm"
          >
            {{ $t('user.settings.email.verified') }}
          </UBadge>
          <UBadge
            v-else
            color="warning"
            variant="subtle"
            size="sm"
          >
            {{ $t('user.settings.email.unverified') }}
          </UBadge>
        </div>
      </UFormField>
      <UFormField
        name="currentPassword"
        :label="$t('user.settings.security.currentPassword')"
        :description="$t('user.settings.email.currentPasswordDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="currentPassword"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          class="w-full sm:w-60"
        />
      </UFormField>
      <UFormField
        name="newEmail"
        :label="$t('user.settings.email.newEmail')"
        :description="$t('user.settings.email.newEmailDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="newEmail"
          type="email"
          :placeholder="t('user.settings.email.newEmailPlaceholder')"
          class="w-full sm:w-60"
        />
      </UFormField>
      <div class="flex justify-end pt-4">
        <UButton
          icon="i-mdi-email-arrow-right-outline"
          :loading="isSaving"
          @click="submit"
        >
          {{ $t('user.settings.email.sendVerification') }}
        </UButton>
      </div>
    </DashboardSettingsSection>

    <UAlert
      v-if="pending"
      color="info"
      variant="subtle"
      icon="i-mdi-email-fast-outline"
      class="mt-4"
      :title="$t('user.settings.email.pendingTitle', { email: pending })"
      :description="$t('user.settings.email.pendingDescription')"
    />
  </div>
</template>
