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
  <div class="auth-shell">
    <div class="auth-panel">
      <div
        class="auth-card"
        style="width:min(600px, 94vw);"
      >
        <div class="grid gap-4">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 class="auth-title">
                创建账号
              </h1>
              <p class="auth-subtitle">
                注册后需要邮箱验证，验证通过后才可以登录。
              </p>
            </div>
            <UBadge
              color="neutral"
              variant="soft"
            >
              Sign Up
            </UBadge>
          </div>

          <UCard class="border-border/70 bg-card/90 shadow-sm">
            <div class="pb-3">
              <h3 class="text-base">
                用户注册
              </h3>
              <p>
                填写基础信息后创建账号。
              </p>
            </div>

            <div>
              <form
                class="grid gap-4"
                @submit.prevent="submit"
              >
                <div class="grid gap-2 md:grid-cols-2">
                  <div class="grid gap-2">
                    <label for="register-username">
                      用户名
                    </label>
                    <UInput
                      id="register-username"
                      v-model="form.username"
                      type="text"
                      autocomplete="username"
                      placeholder="openapi_user"
                    />
                  </div>

                  <div class="grid gap-2">
                    <label for="register-email">
                      邮箱
                    </label>
                    <UInput
                      id="register-email"
                      v-model="form.email"
                      type="email"
                      autocomplete="email"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div class="grid gap-2 md:grid-cols-2">
                  <div class="grid gap-2">
                    <label for="register-password">
                      密码
                    </label>
                    <UInput
                      id="register-password"
                      v-model="form.password"
                      type="password"
                      autocomplete="new-password"
                      placeholder="设置登录密码"
                    />
                  </div>

                  <div class="grid gap-2">
                    <label for="register-confirm">
                      确认密码
                    </label>
                    <UInput
                      id="register-confirm"
                      v-model="form.confirm"
                      type="password"
                      autocomplete="new-password"
                      placeholder="再次输入密码"
                    />
                  </div>
                </div>

                <div
                  v-if="errorMessage"
                  class="grid"
                >
                  <UBadge
                    color="error"
                    class="max-w-full whitespace-normal break-words"
                  >
                    {{ errorMessage }}
                  </UBadge>
                </div>

                <div
                  v-if="successMessage"
                  class="grid"
                >
                  <UBadge
                    color="neutral"
                    variant="soft"
                    class="max-w-full whitespace-normal break-words"
                  >
                    {{ successMessage }}
                  </UBadge>
                </div>

                <div class="flex flex-wrap gap-2">
                  <UButton
                    type="submit"
                    :disabled="submitting"
                  >
                    {{ submitting ? '提交中...' : '注册' }}
                  </UButton>
                  <UButton
                    to="/login"
                    variant="outline"
                  >
                    已有账号
                  </UButton>
                </div>
              </form>
            </div>
          </UCard>

          <p class="auth-note">
            注册即表示你同意平台服务条款与安全规范。
          </p>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>安全策略可配置</h3>
        <p>验证后即可进入用户后台管理自己的 API Key。</p>
        <div class="auth-chip">
          Email Verify · User Console
        </div>
      </div>
    </div>
  </div>
</template>
