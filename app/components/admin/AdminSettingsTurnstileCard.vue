<script setup lang="ts">
import { useAdminSettingsForm } from '~/composables/admin/useAdminSettingsPage'

const form = useAdminSettingsForm()
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center gap-2 px-1">
        <UIcon
          name="i-mdi-robot-outline"
          class="size-5 text-muted"
        />
        <h3 class="font-semibold">
          Cloudflare Turnstile 人机验证
        </h3>
      </div>
    </template>
    <div class="space-y-4">
      <div class="flex flex-col gap-1">
        <USwitch
          v-model="form.turnstileEnabled"
          label="启用 Turnstile"
        />
        <p class="text-xs text-muted">
          总开关。关闭后所有页面均不进行人机验证；未配置 Site Key 或 Secret Key 时也会视为关闭。
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Site Key">
          <UInput
            v-model="form.turnstileSiteKey"
            placeholder="0x4AAAAAA..."
          />
        </UFormField>
        <UFormField label="Secret Key">
          <UInput
            v-model="form.turnstileSecretKey"
            placeholder="0x4AAAAAA..."
          />
        </UFormField>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-default">
        <div class="flex flex-col gap-1">
          <USwitch
            v-model="form.turnstileLoginEnabled"
            :disabled="!form.turnstileEnabled"
            label="用户登录页"
          />
          <p class="text-xs text-muted">
            /login 提交时校验。
          </p>
        </div>
        <div class="flex flex-col gap-1">
          <USwitch
            v-model="form.turnstileRegisterEnabled"
            :disabled="!form.turnstileEnabled"
            label="用户注册页"
          />
          <p class="text-xs text-muted">
            /register 提交时校验。
          </p>
        </div>
        <div class="flex flex-col gap-1">
          <USwitch
            v-model="form.turnstileAdminLoginEnabled"
            :disabled="!form.turnstileEnabled"
            label="管理员登录页"
          />
          <p class="text-xs text-muted">
            /admin/login 提交时校验。
          </p>
        </div>
        <div class="flex flex-col gap-1">
          <USwitch
            v-model="form.turnstilePasswordResetEnabled"
            :disabled="!form.turnstileEnabled || !form.passwordResetEnabled"
            label="忘记密码页"
          />
          <p class="text-xs text-muted">
            /forgot-password 申请重置链接时校验，避免邮件接口被刷。
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
