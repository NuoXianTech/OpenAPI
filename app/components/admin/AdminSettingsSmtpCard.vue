<script setup lang="ts">
import { useAdminSettingsForm } from '~/composables/admin/useAdminSettingsPage'

const form = useAdminSettingsForm()
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center gap-2 px-1">
        <UIcon
          name="i-mdi-email-outline"
          class="size-5 text-muted"
        />
        <h3 class="font-semibold">
          邮件配置 (SMTP)
        </h3>
      </div>
    </template>
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="SMTP 主机">
          <UInput
            v-model="form.smtpHost"
            placeholder="smtp.example.com"
          />
        </UFormField>
        <UFormField label="SMTP 端口">
          <UInput
            v-model.number="form.smtpPort"
            type="number"
            placeholder="465"
          />
        </UFormField>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="SMTP 用户名">
          <UInput
            v-model="form.smtpUser"
            placeholder="user@example.com"
          />
        </UFormField>
        <UFormField label="SMTP 密码">
          <UInput
            v-model="form.smtpPass"
            type="password"
            placeholder="••••••••"
          />
        </UFormField>
      </div>
      <UFormField label="发件人地址">
        <UInput
          v-model="form.smtpFrom"
          placeholder="no-reply@example.com"
        />
      </UFormField>
      <USwitch
        v-model="form.smtpSecure"
        label="使用 SSL/TLS"
      />
    </div>
  </UCard>
</template>
