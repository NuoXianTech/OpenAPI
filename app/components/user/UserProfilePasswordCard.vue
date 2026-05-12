<script setup lang="ts">
const props = defineProps<{
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>
}>()

const toast = useToast()
const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const saving = ref(false)

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
  saving.value = true
  try {
    await props.onSubmit(form.currentPassword, form.newPassword)
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
  }
  catch (err) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '修改失败', color: 'error' })
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-mdi-lock-outline"
          class="size-5 text-muted"
        />
        <h3 class="font-semibold">
          修改密码
        </h3>
      </div>
    </template>
    <div class="space-y-3">
      <UFormField label="当前密码">
        <UInput
          v-model="form.currentPassword"
          type="password"
          placeholder="••••••••"
        />
      </UFormField>
      <UFormField
        label="新密码"
        hint="至少 8 位"
      >
        <UInput
          v-model="form.newPassword"
          type="password"
          placeholder="••••••••"
        />
      </UFormField>
      <UFormField label="确认新密码">
        <UInput
          v-model="form.confirmPassword"
          type="password"
          placeholder="••••••••"
        />
      </UFormField>
      <UAlert
        color="warning"
        variant="soft"
        icon="i-mdi-alert-outline"
        title="修改密码后会注销所有其他设备"
        description="本次会话保留登录状态，其他终端的会话将立即失效。"
      />
      <div class="flex justify-end">
        <UButton
          :loading="saving"
          @click="submit"
        >
          更新密码
        </UButton>
      </div>
    </div>
  </UCard>
</template>
