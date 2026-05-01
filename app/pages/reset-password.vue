<script lang="ts" setup>
const route = useRoute()
const toast = useToast()

const userId = computed(() => Number((route.query.user || '').toString()) || 0)
const token = computed(() => (route.query.token || '').toString())
const linkValid = computed(() => userId.value > 0 && token.value.length > 0)

const form = reactive({
  password: '',
  confirm: '',
})
const errorMessage = ref('')
const submitting = ref(false)
const success = ref(false)

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) {
      return data.message
    }
  }
  return fallback
}

const submit = async () => {
  errorMessage.value = ''

  if (form.password.length < 8) {
    errorMessage.value = '密码至少 8 位'
    return
  }
  if (form.password !== form.confirm) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  submitting.value = true
  try {
    await $fetch<{ code: number, msg: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: {
        userId: userId.value,
        token: token.value,
        newPassword: form.password,
      },
    })
    success.value = true
    toast.add({ title: '密码已重置，请使用新密码登录', color: 'success' })
    await new Promise(resolve => setTimeout(resolve, 800))
    await navigateTo('/login')
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '重置失败，链接可能已失效')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-default flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center size-12 rounded-xl bg-elevated border border-default mb-3">
          <Icon
            name="mdi:lock-reset"
            size="24"
          />
        </div>
        <h1 class="text-xl font-semibold">
          重置密码
        </h1>
        <p class="text-sm text-muted mt-1">
          为账号设置新的登录密码
        </p>
      </div>

      <UCard class="shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
        <div
          v-if="!linkValid"
          class="space-y-3 p-1"
        >
          <div class="text-sm text-[var(--red)] bg-[var(--red)]/5 rounded-lg px-3 py-2">
            重置链接无效或已损坏，请重新申请。
          </div>
          <UButton
            to="/forgot-password"
            block
          >
            重新申请
          </UButton>
        </div>

        <div
          v-else-if="success"
          class="space-y-3 p-1"
        >
          <div class="text-sm text-[var(--green)] bg-[var(--green)]/5 rounded-lg px-3 py-2">
            密码已重置，正在跳转到登录页...
          </div>
        </div>

        <form
          v-else
          class="space-y-4 p-1"
          @submit.prevent="submit"
        >
          <UFormField
            label="新密码"
            help="至少 8 位"
          >
            <UInput
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              placeholder="设置新密码"
              icon="i-mdi-lock-outline"
              autofocus
            />
          </UFormField>

          <UFormField label="确认新密码">
            <UInput
              v-model="form.confirm"
              type="password"
              autocomplete="new-password"
              placeholder="再次输入新密码"
              icon="i-mdi-lock-check-outline"
            />
          </UFormField>

          <div
            v-if="errorMessage"
            class="text-sm text-[var(--red)] bg-[var(--red)]/5 rounded-lg px-3 py-2"
          >
            {{ errorMessage }}
          </div>

          <UButton
            type="submit"
            block
            :loading="submitting"
          >
            重置密码
          </UButton>
        </form>
      </UCard>

      <div class="flex items-center justify-center gap-2 mt-4">
        <UButton
          variant="link"
          size="sm"
          to="/login"
          class="text-muted"
        >
          返回登录
        </UButton>
        <span class="text-muted text-xs">·</span>
        <UButton
          variant="link"
          size="sm"
          to="/"
          class="text-muted"
        >
          返回首页
        </UButton>
      </div>
    </div>
  </div>
</template>
