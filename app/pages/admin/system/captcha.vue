<script setup lang="ts">
import { useAdminSettingsPage } from '~/composables/admin/useAdminSettingsPage'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const { form, saving, save, dirty, changedKeys, reset } = useAdminSettingsPage()

// 目前仅实现 Cloudflare Turnstile，下拉保留以便后续扩展其他验证码服务
const captchaTypeItems = ['Cloudflare Turnstile']
const captchaType = ref('Cloudflare Turnstile')
</script>

<template>
  <div class="space-y-8">
    <div>
      <UPageCard
        title="验证码"
        description="人机验证总开关与服务商配置。未配置 Site Key / Secret Key 时即使开启也视为未启用。"
        variant="naked"
        class="mb-4"
      />
      <UPageCard
        variant="subtle"
        :ui="{ container: 'divide-y divide-default' }"
      >
        <UFormField
          name="turnstileEnabled"
          label="启用验证码"
          description="总开关。关闭后所有页面均不进行人机验证。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <USwitch v-model="form.turnstileEnabled" />
        </UFormField>
        <UFormField
          name="captchaType"
          label="验证码类型"
          description="选择验证码服务提供商。目前仅支持 Cloudflare Turnstile。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
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
          class="flex items-center justify-between not-last:pb-4 gap-2"
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
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <UInput
            v-model="form.turnstileSecretKey"
            placeholder="0x4AAAAAA..."
            autocomplete="off"
            class="min-w-64"
          />
        </UFormField>
      </UPageCard>
    </div>

    <div>
      <UPageCard
        title="验证场景"
        description="选择需要弹出人机验证的页面。需先开启上方「启用验证码」并配置密钥。"
        variant="naked"
        class="mb-4"
      />
      <UPageCard
        variant="subtle"
        :ui="{ container: 'divide-y divide-default' }"
      >
        <UFormField
          name="turnstileLoginEnabled"
          label="登录验证码"
          description="/login 提交时校验。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <USwitch
            v-model="form.turnstileLoginEnabled"
            :disabled="!form.turnstileEnabled"
          />
        </UFormField>
        <UFormField
          name="turnstileRegisterEnabled"
          label="注册验证码"
          description="/register 提交时校验。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <USwitch
            v-model="form.turnstileRegisterEnabled"
            :disabled="!form.turnstileEnabled"
          />
        </UFormField>
        <UFormField
          name="turnstilePasswordResetEnabled"
          label="找回密码验证码"
          description="/forgot-password 申请重置链接时校验，避免邮件接口被刷。需同时开启「忘记密码」功能。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <USwitch
            v-model="form.turnstilePasswordResetEnabled"
            :disabled="!form.turnstileEnabled || !form.passwordResetEnabled"
          />
        </UFormField>
        <UFormField
          name="turnstileAdminLoginEnabled"
          label="管理登录验证码"
          description="/admin/login 提交时校验。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <USwitch
            v-model="form.turnstileAdminLoginEnabled"
            :disabled="!form.turnstileEnabled"
          />
        </UFormField>
        <UFormField
          name="turnstileCheckinEnabled"
          label="每日签到验证码"
          description="积分页点击签到时弹出验证窗口，通过后自动签到。需同时开启「每日签到」功能。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <USwitch
            v-model="form.turnstileCheckinEnabled"
            :disabled="!form.turnstileEnabled || !form.checkinEnabled"
          />
        </UFormField>
      </UPageCard>
    </div>

    <AdminStickySaveBar
      :dirty="dirty"
      :saving="saving"
      :changed-count="changedKeys.length"
      @save="save"
      @reset="reset"
    />
  </div>
</template>
