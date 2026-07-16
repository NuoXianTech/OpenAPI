<script setup lang="ts">
import type { AdminSettingsKey } from '~/composables/admin/use-admin-settings-page'
import { useAdminSettingsPage } from '~/composables/admin/use-admin-settings-page'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'

const { form, createSection } = useAdminSettingsPage()
const toast = useToast()

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
    toast.add({ title: parseFetchError(err, '发送失败'), color: 'error' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="dashboard-settings-page">
    <DashboardSettingsSection
      title="发信"
    >
      <UFormField
        name="smtpFromName"
        label="发件人名"
        description="邮件中展示的发件人姓名，留空则只显示发件邮箱地址。"
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
        label="发件人邮箱"
        description="发件邮箱的地址，也作为 EHLO 域名来源。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.smtpFrom"
          placeholder="no-reply@example.com"
          autocomplete="off"
          class="w-full sm:min-w-64"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpHost"
        label="SMTP 服务器"
        description="发件服务器地址，不含端口号。"
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
        label="SMTP 端口"
        description="发件服务器端口号，常见 465（SSL）/ 587（STARTTLS）。"
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
        label="SMTP 用户名"
        description="发信邮箱用户名，一般与邮箱地址相同。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.smtpUser"
          placeholder="user@example.com"
          autocomplete="off"
          class="w-full sm:min-w-64"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpPass"
        label="SMTP 密码"
        description="发信邮箱密码或授权码。"
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
        label="回信邮箱"
        description="用户回复系统邮件时用于接收回信的邮箱。留空则回信默认回到发件人邮箱。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.smtpReplyTo"
          placeholder="support@example.com"
          autocomplete="off"
          class="w-full sm:min-w-64"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpSecure"
        label="强制使用 SSL 连接"
        description="是否强制使用 SSL 加密连接（465 端口）。若无法发送邮件，可关闭后改用 587 STARTTLS。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <USwitch v-model="form.smtpSecure" />
      </UFormField>
      <USeparator />
      <UFormField
        name="smtpPoolMaxAgeSeconds"
        label="SMTP 连接有效期 (秒)"
        description="有效期内建立的 SMTP 连接会被新邮件发送请求复用。0 = 不复用，每封新建即关闭。"
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
        label="测试发信"
        description="使用当前已保存的 SMTP 配置发送一封测试邮件。若刚改了上方表单，请先点保存再测试。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UButton
          variant="outline"
          icon="i-mdi-send-outline"
          class="max-sm:w-full justify-center"
          @click="openTest"
        >
          发送测试邮件
        </UButton>
      </UFormField>
      <USeparator />
      <AdminSettingsSectionActions
        :dirty="emailSection.dirty.value"
        :saving="emailSection.saving.value"
        :disabled="emailSection.disabled.value"
        @save="emailSection.save"
      />
    </DashboardSettingsSection>

    <UModal
      v-model:open="testOpen"
      title="SMTP 测试发信"
      description="将使用已保存的 SMTP 配置发送一封测试邮件。若你刚修改了上方表单，请先点「保存设置」再测试。"
      :ui="adminModalUi()"
    >
      <template #body>
        <UFormField label="收件邮箱">
          <UInput
            v-model="testEmail"
            type="email"
            placeholder="you@example.com"
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
  </div>
</template>
