<script setup lang="ts">
import type { ProfileData } from '~/composables/user/useUserSettingsPage'
import { parseFetchError } from '#shared/utils/client-error'

const props = defineProps<{
  profile: ProfileData | null
  onRequestChange: (currentPassword: string, newEmail: string) => Promise<string>
}>()

const toast = useToast()
const newEmail = ref('')
const currentPassword = ref('')
const isSaving = ref(false)
const pending = ref<string | null>(null)

async function submit() {
  const v = newEmail.value.trim().toLowerCase()
  if (!v) {
    toast.add({ title: '请输入新邮箱', color: 'warning' })
    return
  }
  if (!currentPassword.value) {
    toast.add({ title: '请输入当前密码', color: 'warning' })
    return
  }
  if (v === (props.profile?.email || '').toLowerCase()) {
    toast.add({ title: '新邮箱与当前邮箱相同', color: 'warning' })
    return
  }
  isSaving.value = true
  try {
    pending.value = await props.onRequestChange(currentPassword.value, v)
    newEmail.value = ''
    currentPassword.value = ''
  } catch (err) {
    toast.add({ title: parseFetchError(err, '发送失败'), color: 'error' })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <UPageCard
      title="绑定邮箱"
      description="修改邮箱需验证当前密码，并通过新邮箱的确认链接生效。更改后头像会自动跟随更新。"
      variant="naked"
      class="mb-4"
    />

    <UPageCard
      variant="subtle"
      :ui="{ container: 'divide-y divide-default' }"
    >
      <UFormField
        label="当前邮箱"
        description="当前账号绑定并用于接收系统邮件的邮箱。"
        class="flex items-center justify-between not-last:pb-4 gap-2"
      >
        <div class="flex items-center gap-2">
          <span class="font-mono text-sm">{{ profile?.email }}</span>
          <UBadge
            v-if="profile?.emailVerifiedAt"
            color="success"
            variant="subtle"
            size="sm"
          >
            已验证
          </UBadge>
          <UBadge
            v-else
            color="warning"
            variant="subtle"
            size="sm"
          >
            未验证
          </UBadge>
        </div>
      </UFormField>
      <UFormField
        name="currentPassword"
        label="当前密码"
        description="为保护账号安全，修改邮箱需先验证当前密码。"
        class="flex items-center justify-between not-last:pb-4 gap-2"
      >
        <UInput
          v-model="currentPassword"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          class="min-w-64"
        />
      </UFormField>
      <UFormField
        name="newEmail"
        label="新邮箱"
        description="将向该邮箱发送验证邮件，点击邮件中的链接后才会生效。"
        class="flex items-center justify-between not-last:pb-4 gap-2"
      >
        <UInput
          v-model="newEmail"
          type="email"
          placeholder="new@example.com"
          class="min-w-64"
        />
      </UFormField>
      <div class="flex justify-end pt-4">
        <UButton
          icon="i-mdi-email-arrow-right-outline"
          :loading="isSaving"
          @click="submit"
        >
          发送验证
        </UButton>
      </div>
    </UPageCard>

    <UAlert
      v-if="pending"
      color="info"
      variant="subtle"
      icon="i-mdi-email-fast-outline"
      class="mt-4"
      :title="`已发送验证邮件到 ${pending}`"
      description="请到该邮箱点击确认链接以完成更改。链接的有效期由站点配置决定。"
    />
  </div>
</template>
