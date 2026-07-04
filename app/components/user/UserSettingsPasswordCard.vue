<script setup lang="ts">
import { parseFetchError } from '#shared/utils/client-error'

const props = defineProps<{
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>
}>()

const toast = useToast()
const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const isSaving = ref(false)

async function submit() {
  if (!form.currentPassword) {
    toast.add({ title: '请输入当前密码', color: 'warning' })
    return
  }
  if (form.newPassword.length < 8) {
    toast.add({ title: '新密码至少 8 位', color: 'warning' })
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    toast.add({ title: '两次输入的新密码不一致', color: 'warning' })
    return
  }
  isSaving.value = true
  try {
    await props.onSubmit(form.currentPassword, form.newPassword)
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
  } catch (err) {
    toast.add({ title: parseFetchError(err, '修改失败'), color: 'error' })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <DashboardSettingsSection
    title="修改密码"
    description="定期更换密码有助于保护账号安全。修改后其他设备会被强制下线。"
  >
    <UFormField
      label="当前密码"
      description="验证身份所需的现有密码。"
      class="flex items-center justify-between gap-2"
    >
      <UInput
        v-model="form.currentPassword"
        type="password"
        placeholder="••••••••"
        autocomplete="current-password"
        class="min-w-64"
      />
    </UFormField>
    <UFormField
      label="新密码"
      description="至少 8 位，建议混合大小写字母与数字。"
      class="flex items-center justify-between gap-2"
    >
      <UInput
        v-model="form.newPassword"
        type="password"
        placeholder="••••••••"
        autocomplete="new-password"
        class="min-w-64"
      />
    </UFormField>
    <UFormField
      label="确认新密码"
      description="再次输入新密码以确认无误。"
      class="flex items-center justify-between gap-2"
    >
      <UInput
        v-model="form.confirmPassword"
        type="password"
        placeholder="••••••••"
        autocomplete="new-password"
        class="min-w-64"
      />
    </UFormField>
    <div class="flex justify-end pt-4">
      <UButton
        :loading="isSaving"
        icon="i-mdi-content-save-outline"
        @click="submit"
      >
        更新密码
      </UButton>
    </div>
  </DashboardSettingsSection>
</template>
