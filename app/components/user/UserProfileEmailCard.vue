<script setup lang="ts">
import type { ProfileData } from '~/composables/user/useUserProfilePage'
import { parseFetchError } from '#shared/utils/clientError'

const props = defineProps<{
  profile: ProfileData | null
  onRequestChange: (currentPassword: string, newEmail: string) => Promise<string>
}>()

const toast = useToast()
const newEmail = ref('')
const currentPassword = ref('')
const saving = ref(false)
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
  saving.value = true
  try {
    pending.value = await props.onRequestChange(currentPassword.value, v)
    newEmail.value = ''
    currentPassword.value = ''
  } catch (err) {
    toast.add({ title: parseFetchError(err, '发送失败'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-mdi-email-outline"
          class="size-5 text-muted"
        />
        <h3 class="font-semibold">
          绑定邮箱
        </h3>
      </div>
    </template>
    <div class="space-y-3">
      <div class="rounded-lg border border-default bg-elevated/30 p-3 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-muted">当前邮箱</span>
          <span class="font-mono">{{ profile?.email }}</span>
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
      </div>
      <div class="text-xs text-muted">
        修改邮箱将向新邮箱发送一封验证邮件，点击邮件中的链接后才会生效。
        更改邮箱后头像会自动跟随更新。
      </div>
      <UFormField label="当前密码">
        <UInput
          v-model="currentPassword"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
        />
      </UFormField>
      <div class="flex flex-wrap items-end gap-3">
        <UFormField
          label="新邮箱"
          class="flex-1 min-w-[260px]"
        >
          <UInput
            v-model="newEmail"
            type="email"
            placeholder="new@example.com"
          />
        </UFormField>
        <UButton
          icon="i-mdi-email-arrow-right-outline"
          :loading="saving"
          @click="submit"
        >
          发送验证
        </UButton>
      </div>
      <UAlert
        v-if="pending"
        color="info"
        variant="subtle"
        icon="i-mdi-email-fast-outline"
        :title="`已发送验证邮件到 ${pending}`"
        description="请到该邮箱点击确认链接以完成更改。链接的有效期由站点配置决定。"
      />
    </div>
  </UCard>
</template>
