<script setup lang="ts">
import { parseFetchError } from '~/utils/client-error'

const props = defineProps<{
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>
}>()

const toast = useToast()
const { t } = useI18n()
const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const isSaving = ref(false)
const hasChanges = computed(() => Object.values(form).some(Boolean))

async function submit() {
  if (!form.currentPassword) {
    toast.add({ title: t('user.settings.security.enterCurrentPassword'), color: 'warning' })
    return
  }
  if (form.newPassword.length < 8) {
    toast.add({ title: t('user.settings.security.passwordTooShort'), color: 'warning' })
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    toast.add({ title: t('user.settings.security.passwordMismatch'), color: 'warning' })
    return
  }
  isSaving.value = true
  try {
    await props.onSubmit(form.currentPassword, form.newPassword)
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
  } catch (err) {
    toast.add({ title: parseFetchError(err, t('common.feedback.updateFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <DashboardSettingsSection
    :title="$t('user.settings.security.title')"
  >
    <UFormField
      :label="$t('user.settings.security.currentPassword')"
      :description="$t('user.settings.security.currentPasswordDescription')"
      class="flex max-sm:flex-col justify-between items-start gap-4"
    >
      <UInput
        v-model="form.currentPassword"
        type="password"
        placeholder="••••••••"
        autocomplete="current-password"
        class="w-full sm:w-60"
      />
    </UFormField>
    <UFormField
      :label="$t('user.settings.security.newPassword')"
      :description="$t('user.settings.security.newPasswordDescription')"
      class="flex max-sm:flex-col justify-between items-start gap-4"
    >
      <UInput
        v-model="form.newPassword"
        type="password"
        placeholder="••••••••"
        autocomplete="new-password"
        class="w-full sm:w-60"
      />
    </UFormField>
    <UFormField
      :label="$t('user.settings.security.confirmPassword')"
      :description="$t('user.settings.security.confirmPasswordDescription')"
      class="flex max-sm:flex-col justify-between items-start gap-4"
    >
      <UInput
        v-model="form.confirmPassword"
        type="password"
        placeholder="••••••••"
        autocomplete="new-password"
        class="w-full sm:w-60"
      />
    </UFormField>
    <div class="flex justify-end pt-4">
      <UButton
        :loading="isSaving"
        :disabled="!hasChanges || isSaving"
        icon="i-mdi-content-save-outline"
        @click="submit"
      >
        {{ $t('user.settings.security.updatePassword') }}
      </UButton>
    </div>
  </DashboardSettingsSection>
</template>
