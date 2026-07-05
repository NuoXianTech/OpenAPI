<script setup lang="ts">
import { useAdminSettingsPage } from '~/composables/admin/use-admin-settings-page'

const { form, saving, save, dirty, changedKeys, reset } = useAdminSettingsPage()

// 目前仅实现 Cloudflare Turnstile，下拉保留以便后续扩展其他验证码服务
const captchaTypeItems = ['Cloudflare Turnstile']
const captchaType = ref('Cloudflare Turnstile')
</script>

<template>
  <div class="dashboard-settings-page">
    <DashboardSettingsSection
      title="验证码"
      description="人机验证服务商配置。未配置 Site Key / Secret Key 时所有验证场景均不生效。"
    >
      <UFormField
        name="captchaType"
        label="验证码类型"
        description="选择验证码服务提供商。目前仅支持 Cloudflare Turnstile。"
        class="flex items-center justify-between gap-2"
      >
        <USelect
          v-model="captchaType"
          :items="captchaTypeItems"
          class="min-w-56"
        />
      </UFormField>
      <UFormField
        name="turnstileSiteKey"
        label="站点密钥 (Site Key)"
        description="Cloudflare Turnstile 应用页获取到的 Site Key。"
        class="flex items-center justify-between gap-2"
      >
        <UInput
          v-model="form.turnstileSiteKey"
          placeholder="0x4AAAAAA..."
          autocomplete="off"
          class="min-w-64"
        />
      </UFormField>
      <UFormField
        name="turnstileSecretKey"
        label="密钥 (Secret Key)"
        description="Cloudflare Turnstile 应用页获取到的 Secret Key。"
        class="flex items-center justify-between gap-2"
      >
        <UInput
          v-model="form.turnstileSecretKey"
          placeholder="0x4AAAAAA..."
          autocomplete="off"
          class="min-w-64"
        />
      </UFormField>
    </DashboardSettingsSection>

    <DashboardSettingsSection
      title="验证场景"
      description="选择需要弹出人机验证的页面。需先在上方配置 Site Key / Secret Key 后方可生效。"
    >
      <UFormField
        name="turnstileLoginEnabled"
        label="登录验证码"
        description="/login 提交时校验。"
        class="flex items-center justify-between gap-2"
      >
        <USwitch v-model="form.turnstileLoginEnabled" />
      </UFormField>
      <UFormField
        name="turnstileRegisterEnabled"
        label="注册验证码"
        description="/register 提交时校验。"
        class="flex items-center justify-between gap-2"
      >
        <USwitch v-model="form.turnstileRegisterEnabled" />
      </UFormField>
      <UFormField
        name="turnstilePasswordResetEnabled"
        label="找回密码验证码"
        description="/forgot-password 申请重置链接时校验，避免邮件接口被刷。需同时开启「忘记密码」功能。"
        class="flex items-center justify-between gap-2"
      >
        <USwitch
          v-model="form.turnstilePasswordResetEnabled"
          :disabled="!form.passwordResetEnabled"
        />
      </UFormField>
      <UFormField
        name="turnstileAdminLoginEnabled"
        label="管理登录验证码"
        description="/admin/login 提交时校验。"
        class="flex items-center justify-between gap-2"
      >
        <USwitch v-model="form.turnstileAdminLoginEnabled" />
      </UFormField>
      <UFormField
        name="turnstileCheckinEnabled"
        label="每日签到验证码"
        description="积分页点击签到时弹出验证窗口，通过后自动签到。需同时开启「每日签到」功能。"
        class="flex items-center justify-between gap-2"
      >
        <USwitch
          v-model="form.turnstileCheckinEnabled"
          :disabled="!form.checkinEnabled"
        />
      </UFormField>
    </DashboardSettingsSection>

    <AdminStickySaveBar
      :dirty="dirty"
      :saving="saving"
      :changed-count="changedKeys.length"
      @save="save"
      @reset="reset"
    />
  </div>
</template>
