<script lang="ts" setup>
const { register } = useAuth()
const form = reactive({
  username: '',
  email: '',
  password: '',
  confirm: '',
})
const errorMessage = ref('')
const successMessage = ref('')
const submitting = ref(false)

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

const submit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (form.password !== form.confirm) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  submitting.value = true
  try {
    const res = await register({
      username: form.username,
      email: form.email,
      password: form.password,
    })
    successMessage.value = res.verificationRequired
      ? '账号已创建，请查收邮箱完成验证。'
      : '账号创建成功，可以直接登录。'
    form.password = ''
    form.confirm = ''
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '注册失败')
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
            name="mdi:account-plus-outline"
            size="24"
          />
        </div>
        <h1 class="text-xl font-semibold">
          创建账号
        </h1>
        <p class="text-sm text-muted mt-1">
          注册后需邮箱验证，验证通过才能登录
        </p>
      </div>

      <UCard class="shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
        <form
          class="space-y-4 p-1"
          @submit.prevent="submit"
        >
          <UFormField label="用户名">
            <UInput
              v-model="form.username"
              type="text"
              autocomplete="username"
              placeholder="openapi_user"
              icon="i-mdi-account-outline"
              autofocus
            />
          </UFormField>

          <UFormField label="邮箱">
            <UInput
              v-model="form.email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              icon="i-mdi-email-outline"
            />
          </UFormField>

          <UFormField label="密码">
            <UInput
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              placeholder="设置登录密码"
              icon="i-mdi-lock-outline"
            />
          </UFormField>

          <UFormField label="确认密码">
            <UInput
              v-model="form.confirm"
              type="password"
              autocomplete="new-password"
              placeholder="再次输入密码"
              icon="i-mdi-lock-check-outline"
            />
          </UFormField>

          <div
            v-if="errorMessage"
            class="text-sm text-[var(--red)] bg-[var(--red)]/5 rounded-lg px-3 py-2"
          >
            {{ errorMessage }}
          </div>

          <div
            v-if="successMessage"
            class="text-sm text-[var(--green)] bg-[var(--green)]/5 rounded-lg px-3 py-2"
          >
            {{ successMessage }}
          </div>

          <UButton
            type="submit"
            block
            :loading="submitting"
          >
            注册
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
          已有账号
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
