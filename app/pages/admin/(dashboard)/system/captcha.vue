<script setup lang="ts">
import type { AdminSettingsKey } from '~/composables/admin/use-admin-settings-page'
import { useAdminSettingsPage } from '~/composables/admin/use-admin-settings-page'

const { form, createSection } = useAdminSettingsPage()

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
const captchaTypeItems = ['Cloudflare Turnstile']
const captchaType = ref('Cloudflare Turnstile')
</script>

<template>
  <div class="dashboard-settings-page">
    <DashboardSettingsSection
      title="验证码"
    >
      <UFormField
        name="captchaType"
        label="验证码类型"
        description="选择验证码服务提供商。目前仅支持 Cloudflare Turnstile。"
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
        label="站点密钥 (Site Key)"
        description="Cloudflare Turnstile 应用页获取到的 Site Key。"
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
        label="密钥 (Secret Key)"
        description="Cloudflare Turnstile 应用页获取到的 Secret Key。"
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
      title="验证场景"
    >
      <UFormField
        name="turnstileLoginEnabled"
        label="登录验证码"
        description="/login 提交时校验。"
        class="flex max-sm:flex-col items-start justify-between gap-4"
      >
        <USwitch v-model="form.turnstileLoginEnabled" />
      </UFormField>
      <UFormField
        name="turnstileRegisterEnabled"
        label="注册验证码"
        description="/register 提交时校验。"
        class="flex max-sm:flex-col items-start justify-between gap-4"
      >
        <USwitch v-model="form.turnstileRegisterEnabled" />
      </UFormField>
      <UFormField
        name="turnstilePasswordResetEnabled"
        label="找回密码验证码"
        description="/forgot-password 申请重置链接时校验，避免邮件接口被刷。需同时开启「忘记密码」功能。"
        class="flex max-sm:flex-col items-start justify-between gap-4"
      >
        <USwitch
          v-model="form.turnstilePasswordResetEnabled"
          :disabled="!form.passwordResetEnabled"
        />
      </UFormField>
      <UFormField
        name="turnstileCheckinEnabled"
        label="每日签到验证码"
        description="积分页点击签到时弹出验证窗口，通过后自动签到。需同时开启「每日签到」功能。"
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
