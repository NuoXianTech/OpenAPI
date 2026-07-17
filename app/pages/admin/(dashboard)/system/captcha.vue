<script setup lang="ts">
import type { AdminSettingsKey } from '~/composables/admin/use-admin-settings-page'
import { useAdminSettingsPage } from '~/composables/admin/use-admin-settings-page'

const { form, createSection } = useAdminSettingsPage()
const { t } = useI18n()

const captchaCredentialKeys = [
  'turnstileSiteKey',
  'turnstileSecretKey'
] as const satisfies readonly AdminSettingsKey[]

const captchaSceneKeys = [
  'turnstileLoginEnabled',
  'turnstileRegisterEnabled',
  'turnstilePasswordResetEnabled',
  'turnstileCheckinEnabled'
] as const satisfies readonly AdminSettingsKey[]

const captchaCredentialSection = createSection(captchaCredentialKeys)
const captchaSceneSection = createSection(captchaSceneKeys)

// 目前仅实现 Cloudflare Turnstile，下拉保留以便后续扩展其他验证码服务
const captchaTypeItems = computed(() => [
  { label: t('admin.system.captcha.providers.turnstile'), value: 'turnstile' }
])
const captchaType = ref('turnstile')
</script>

<template>
  <div class="dashboard-settings-page">
    <DashboardSettingsSection
      :title="t('admin.system.captcha.credentials.title')"
    >
      <UFormField
        name="captchaType"
        :label="t('admin.system.captcha.credentials.type.label')"
        :description="t('admin.system.captcha.credentials.type.description')"
        class="flex max-sm:flex-col items-start justify-between gap-4"
      >
        <USelect
          v-model="captchaType"
          :items="captchaTypeItems"
          class="w-full sm:min-w-56"
        />
      </UFormField>
      <UFormField
        name="turnstileSiteKey"
        :label="t('admin.system.captcha.credentials.siteKey.label')"
        :description="t('admin.system.captcha.credentials.siteKey.description')"
        class="flex max-sm:flex-col items-start justify-between gap-4"
      >
        <UInput
          v-model="form.turnstileSiteKey"
          placeholder="0x4AAAAAA..."
          autocomplete="off"
          class="w-full sm:min-w-64"
        />
      </UFormField>
      <UFormField
        name="turnstileSecretKey"
        :label="t('admin.system.captcha.credentials.secretKey.label')"
        :description="t('admin.system.captcha.credentials.secretKey.description')"
        class="flex max-sm:flex-col items-start justify-between gap-4"
      >
        <UInput
          v-model="form.turnstileSecretKey"
          placeholder="0x4AAAAAA..."
          autocomplete="off"
          class="w-full sm:min-w-64"
        />
      </UFormField>
      <USeparator />
      <AdminSettingsSectionActions
        :dirty="captchaCredentialSection.dirty.value"
        :saving="captchaCredentialSection.saving.value"
        :disabled="captchaCredentialSection.disabled.value"
        @save="captchaCredentialSection.save"
      />
    </DashboardSettingsSection>

    <DashboardSettingsSection
      :title="t('admin.system.captcha.scenes.title')"
    >
      <UFormField
        name="turnstileLoginEnabled"
        :label="t('admin.system.captcha.scenes.login.label')"
        :description="t('admin.system.captcha.scenes.login.description')"
        class="flex max-sm:flex-col items-start justify-between gap-4"
      >
        <USwitch v-model="form.turnstileLoginEnabled" />
      </UFormField>
      <UFormField
        name="turnstileRegisterEnabled"
        :label="t('admin.system.captcha.scenes.register.label')"
        :description="t('admin.system.captcha.scenes.register.description')"
        class="flex max-sm:flex-col items-start justify-between gap-4"
      >
        <USwitch v-model="form.turnstileRegisterEnabled" />
      </UFormField>
      <UFormField
        name="turnstilePasswordResetEnabled"
        :label="t('admin.system.captcha.scenes.passwordReset.label')"
        :description="t('admin.system.captcha.scenes.passwordReset.description')"
        class="flex max-sm:flex-col items-start justify-between gap-4"
      >
        <USwitch
          v-model="form.turnstilePasswordResetEnabled"
          :disabled="!form.passwordResetEnabled"
        />
      </UFormField>
      <UFormField
        name="turnstileCheckinEnabled"
        :label="t('admin.system.captcha.scenes.checkin.label')"
        :description="t('admin.system.captcha.scenes.checkin.description')"
        class="flex max-sm:flex-col items-start justify-between gap-4"
      >
        <USwitch
          v-model="form.turnstileCheckinEnabled"
          :disabled="!form.checkinEnabled"
        />
      </UFormField>
      <USeparator />
      <AdminSettingsSectionActions
        :dirty="captchaSceneSection.dirty.value"
        :saving="captchaSceneSection.saving.value"
        :disabled="captchaSceneSection.disabled.value"
        @save="captchaSceneSection.save"
      />
    </DashboardSettingsSection>
  </div>
</template>
