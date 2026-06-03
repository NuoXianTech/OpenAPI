<script setup lang="ts">
const items = ref(['Cloudflare Turnstile', 'Cap'])
const value = ref('Cloudflare Turnstile')
</script>

<template>
  <UPageCard
    title="验证码"
    variant="naked"
  />
  <UPageCard variant="subtle" :ui="{ container: 'divide-y divide-default' }">
    <UFormField
      name="xxx"
      label="登录验证码"
      description="是否启用登录表单验证码。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <USwitch />
    </UFormField>
    <UFormField
      name="xxx"
      label="注册验证码"
      description="是否启用注册表单验证码。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <USwitch />
    </UFormField>
    <UFormField
      name="xxx"
      label="找回密码验证码"
      description="是否启用找回密码表单验证码。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <USwitch />
    </UFormField>
    <UFormField
      name="xxx"
      label="管理登录验证码"
      description="是否启用管理登录表单验证码。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <USwitch />
    </UFormField>
    <UFormField
      name="xxx"
      label="每日签到验证码"
      description="是否启用每日签到时弹窗验证码。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <USwitch />
    </UFormField>
  </UPageCard>
  <UPageCard
    title="验证码类型"
    variant="naked"
  />
  <UPageCard variant="subtle" :ui="{ container: 'divide-y divide-default' }">
    <UFormField
      name="xxx"
      label="验证码类型"
      description="选择验证码类型和验证码服务提供商。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <USelect v-model="value" :items="items" />
    </UFormField>
    <UFormField
      name="xxx"
      label="站点密钥"
      description="应用管理页面 获取到的站点密钥。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <UInput
          autocomplete="off"
        />
    </UFormField>
    <UFormField
      name="xxx"
      label="密钥"
      description="应用管理页面 获取到的秘钥。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <UInput
          autocomplete="off"
        />
    </UFormField>
  </UPageCard>
</template>
