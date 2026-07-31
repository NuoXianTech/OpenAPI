<script setup lang="ts">
import type { AdminSettingsKey } from '~/composables/admin/use-admin-settings-page'
import { useAdminSettingsPage } from '~/composables/admin/use-admin-settings-page'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'

const { form, createSection } = useAdminSettingsPage()
const toast = useToast()
const { t } = useI18n()

const emailKeys = [
  'smtpFromName',
  'smtpFrom',
  'smtpHost',
  'smtpPort',
  'smtpUser',
  'smtpPass',
  'smtpReplyTo',
  'smtpSecure',
  'smtpPoolMaxAgeSeconds'
] as const satisfies readonly AdminSettingsKey[]

const emailSection = createSection(emailKeys)

const testOpen = ref(false)
const testEmail = ref('')
const sending = ref(false)

function openTest(): void {
  testEmail.value = ''
  testOpen.value = true
}

async function submitTest(): Promise<void> {
  const to = testEmail.value.trim()
  if (!to) {
    toast.add({ title: t('admin.system.email.feedback.recipientRequired'), color: 'warning' })
    return
  }
  sending.value = true
  try {
    await $fetch('/api/admin/settings/test-email', {
      method: 'POST',
      body: { to }
    })
    toast.add({
      title: t('admin.system.email.feedback.sent'),
      description: t('admin.system.email.feedback.sentDescription', { email: to }),
      color: 'success'
    })
    testOpen.value = false
  } catch (err) {
    toast.add({
      title: parseFetchError(err, t('admin.system.email.feedback.sendFailed')),
      color: 'error'
    })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="dashboard-settings-page">
    <DashboardSettingsSection
      :title="t('admin.system.email.settings.title')"
    >
      <UFormField
        name="smtpFromName"
        :label="t('admin.system.email.settings.fromName.label')"
        :description="t('admin.system.email.settings.fromName.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.smtpFromName"
          placeholder="OpenAPI"
          autocomplete="off"
          class="w-full sm:min-w-64"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpFrom"
        :label="t('admin.system.email.settings.fromAddress.label')"
        :description="t('admin.system.email.settings.fromAddress.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.smtpFrom"
          :placeholder="t('admin.system.email.settings.fromAddress.placeholder')"
          autocomplete="off"
          class="w-full sm:min-w-64"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpHost"
        :label="t('admin.system.email.settings.host.label')"
        :description="t('admin.system.email.settings.host.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.smtpHost"
          placeholder="smtp.example.com"
          autocomplete="off"
          class="w-full sm:min-w-64"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpPort"
        :label="t('admin.system.email.settings.port.label')"
        :description="t('admin.system.email.settings.port.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model.number="form.smtpPort"
          type="number"
          :min="1"
          :max="65535"
          placeholder="465"
          class="w-full sm:w-32"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpUser"
        :label="t('admin.system.email.settings.username.label')"
        :description="t('admin.system.email.settings.username.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.smtpUser"
          :placeholder="t('admin.system.email.settings.username.placeholder')"
          autocomplete="off"
          class="w-full sm:min-w-64"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpPass"
        :label="t('admin.system.email.settings.password.label')"
        :description="t('admin.system.email.settings.password.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.smtpPass"
          type="password"
          placeholder="••••••••"
          autocomplete="new-password"
          class="w-full sm:min-w-64"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpReplyTo"
        :label="t('admin.system.email.settings.replyTo.label')"
        :description="t('admin.system.email.settings.replyTo.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.smtpReplyTo"
          :placeholder="t('admin.system.email.settings.replyTo.placeholder')"
          autocomplete="off"
          class="w-full sm:min-w-64"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpSecure"
        :label="t('admin.system.email.settings.secure.label')"
        :description="t('admin.system.email.settings.secure.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <USwitch v-model="form.smtpSecure" />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpPoolMaxAgeSeconds"
        :label="t('admin.system.email.settings.poolMaxAge.label')"
        :description="t('admin.system.email.settings.poolMaxAge.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model.number="form.smtpPoolMaxAgeSeconds"
          type="number"
          :min="0"
          :max="86400"
          class="w-full sm:w-32"
        />
      </UFormField>
      <USeparator />
      <UFormField
        :label="t('admin.system.email.settings.test.label')"
        :description="t('admin.system.email.settings.test.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UButton
          variant="outline"
          icon="i-mdi-send-outline"
          class="max-sm:w-full justify-center"
          @click="openTest"
        >
          {{ t('admin.system.email.actions.sendTest') }}
        </UButton>
      </UFormField>
      <template #footer>
        <AdminSettingsSectionActions
          :dirty="emailSection.dirty.value"
          :saving="emailSection.saving.value"
          :disabled="emailSection.disabled.value"
          @save="emailSection.save"
        />
      </template>
    </DashboardSettingsSection>

    <UModal
      v-model:open="testOpen"
      :title="t('admin.system.email.testModal.title')"
      :description="t('admin.system.email.testModal.description')"
      :ui="adminModalUi()"
    >
      <template #body>
        <UFormField :label="t('admin.system.email.testModal.recipient')">
          <UInput
            v-model="testEmail"
            type="email"
            :placeholder="t('admin.system.email.testModal.recipientPlaceholder')"
            autofocus
            class="w-full"
            @keydown.enter="submitTest"
          />
        </UFormField>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="sending"
            @click="() => { testOpen = false }"
          >
            {{ t('common.actions.cancel') }}
          </UButton>
          <UButton
            :loading="sending"
            icon="i-mdi-send-outline"
            @click="submitTest"
          >
            {{ t('admin.system.email.actions.send') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
