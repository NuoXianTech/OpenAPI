<script lang="ts" setup>
import { toast } from 'vue-sonner'

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
    toast.error(errorMessage.value)
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
    toast.success(successMessage.value)
    form.password = ''
    form.confirm = ''
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '注册失败')
    toast.error(errorMessage.value)
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
            <Badge variant="secondary">
              Sign Up
            </Badge>
          </div>

          <Card class="border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">
                用户注册
              </CardTitle>
              <CardDescription>
                填写基础信息后创建账号。
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                class="grid gap-4"
                @submit.prevent="submit"
              >
                <div class="grid gap-2 md:grid-cols-2">
                  <div class="grid gap-2">
                    <Label for="register-username">
                      用户名
                    </Label>
                    <Input
                      id="register-username"
                      v-model="form.username"
                      type="text"
                      autocomplete="username"
                      placeholder="openapi_user"
                    />
                  </div>

                  <div class="grid gap-2">
                    <Label for="register-email">
                      邮箱
                    </Label>
                    <Input
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
                    <Label for="register-password">
                      密码
                    </Label>
                    <Input
                      id="register-password"
                      v-model="form.password"
                      type="password"
                      autocomplete="new-password"
                      placeholder="设置登录密码"
                    />
                  </div>

                  <div class="grid gap-2">
                    <Label for="register-confirm">
                      确认密码
                    </Label>
                    <Input
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
                  <Badge
                    variant="destructive"
                    class="max-w-full whitespace-normal break-words"
                  >
                    {{ errorMessage }}
                  </Badge>
                </div>

                <div
                  v-if="successMessage"
                  class="grid"
                >
                  <Badge
                    variant="secondary"
                    class="max-w-full whitespace-normal break-words"
                  >
                    {{ successMessage }}
                  </Badge>
                </div>

                <div class="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    :disabled="submitting"
                  >
                    {{ submitting ? '提交中...' : '注册' }}
                  </Button>
                  <Button
                    as-child
                    variant="outline"
                  >
                    <NuxtLink to="/login">
                      已有账号
                    </NuxtLink>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

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
