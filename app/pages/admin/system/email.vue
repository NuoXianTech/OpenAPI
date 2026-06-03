<script setup lang="ts">
</script>

<template>
  <UPageCard
    title="发信"
    variant="naked"
  />
  <UPageCard variant="subtle" :ui="{ container: 'divide-y divide-default' }">
    <UFormField
      name="xxx"
      label="发件人名"
      description="邮件中展示的发件人姓名。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <UInput
          autocomplete="off"
        />
    </UFormField>
    <UFormField
      name="xxx"
      label="发件人邮箱"
      description="发件邮箱的地址。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <UInput
          autocomplete="off"
        />
    </UFormField>
    <UFormField
      name="xxx"
      label="SMTP 服务器"
      description="发件服务器地址，不含端口号。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <UInput
          autocomplete="off"
        />
    </UFormField>
    <UFormField
      name="xxx"
      label="SMTP 端口"
      description="发件服务器端口号。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <UInput
          autocomplete="off"
        />
    </UFormField>
    <UFormField
      name="xxx"
      label="SMTP 用户名"
      description="发信邮箱用户名，一般与邮箱地址相同。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <UInput
          autocomplete="off"
        />
    </UFormField>
    <UFormField
      name="xxx"
      label="SMTP 密码"
      description="发信邮箱密码。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <UInput
          autocomplete="off"
        />
    </UFormField>
    <UFormField
      name="xxx"
      label="回信邮箱"
      description="用户回复系统发送的邮件时，用于接收回信的邮箱。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <UInput
          autocomplete="off"
        />
    </UFormField>
    <UFormField
      name="xxx"
      label="强制使用 SSL 连接"
      description="是否强制使用 SSL 加密连接。如果无法发送邮件，可关闭此项"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <USwitch />
    </UFormField>
    <UFormField
      name="xxx"
      label="SMTP 连接有效期 (秒)"
      description="有效期内建立的 SMTP 连接会被新邮件发送请求复用。"
      class="flex items-center justify-between not-last:pb-4 gap-2"
    >
      <UInput
          autocomplete="off"
        />
    </UFormField>
    <UButton>发送测试邮件</UButton>
  </UPageCard>
</template>
