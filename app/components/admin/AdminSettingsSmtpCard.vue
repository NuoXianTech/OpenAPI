<script setup lang="ts">
import { useAdminSettingsForm } from '~/composables/admin/useAdminSettingsPage'
import { parseFetchError } from '#shared/utils/clientError'

const form = useAdminSettingsForm()
const toast = useToast()

const testOpen = ref(false)
const testEmail = ref('')
const sending = ref(false)

function openTest() {
  testEmail.value = ''
  testOpen.value = true
}

async function submitTest() {
  const to = testEmail.value.trim()
  if (!to) {
    toast.add({ title: '请输入收件邮箱', color: 'warning' })
    return
  }
  sending.value = true
  try {
    await $fetch('/api/admin/settings/test-email', {
      method: 'POST',
      body: { to }
    })
    toast.add({ title: '测试邮件已发送', description: `请到 ${to} 查收`, color: 'success' })
    testOpen.value = false
  } catch (err) {
    toast.add({
      title: parseFetchError(err, '发送失败'),
      color: 'error'
    })
  } finally {
    sending.value = false
  }
}
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
        <UButton
          size="xs"
          variant="outline"
          icon="i-mdi-send-outline"
          class="ml-auto"
          @click="openTest"
        >
          测试发信
        </UButton>
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

    <UModal
      v-model:open="testOpen"
      title="SMTP 测试发信"
      description="将使用已保存的 SMTP 配置发送一封测试邮件。若你刚修改了上方表单，请先点「保存」再测试。"
    >
      <template #body>
        <UFormField label="收件邮箱">
          <UInput
            v-model="testEmail"
            type="email"
            placeholder="you@example.com"
            autofocus
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
            @click="testOpen = false"
          >
            取消
          </UButton>
          <UButton
            :loading="sending"
            icon="i-mdi-send-outline"
            @click="submitTest"
          >
            发送
          </UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
