<script lang="ts" setup>
const { fetchMe, user, login } = useAuth()
const form = reactive({
  identifier: '',
  password: '',
})
const errorMessage = ref('')
const submitting = ref(false)
const checkingAuth = ref(true)

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

onMounted(async () => {
  await fetchMe()
  if (user.value) {
    await navigateTo(user.value.kind === 'admin' ? '/admin' : '/')
    return
  }
  checkingAuth.value = false
})

const submit = async () => {
  errorMessage.value = ''
  submitting.value = true
  try {
    const payload = form.identifier.includes('@')
      ? { email: form.identifier, password: form.password }
      : { username: form.identifier, password: form.password }

    await login(payload)
    await navigateTo('/')
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '登录失败')
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
        style="width:min(560px, 94vw);"
      >
        <div
          v-if="checkingAuth"
          class="grid gap-4"
        >
          <div class="flex items-center gap-2">
            <UBadge
              color="neutral"
              variant="soft"
            >
              Session
            </UBadge>
            <UBadge variant="outline">
              Checking
            </UBadge>
          </div>
          <h1 class="auth-title">
            检查登录状态
          </h1>
          <p class="auth-subtitle">
            正在确认是否已登录，请稍候...
          </p>
          <div class="grid gap-2">
            <USkeleton class="h-10 w-full rounded-md" />
            <USkeleton class="h-10 w-full rounded-md" />
            <USkeleton class="h-10 w-1/2 rounded-md" />
          </div>
        </div>

        <div
          v-else
          class="grid gap-4"
        >
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 class="auth-title">
                欢迎回来
              </h1>
              <p class="auth-subtitle">
                使用邮箱或用户名登录，继续管理你的 API。
              </p>
            </div>
            <UBadge
              color="neutral"
              variant="soft"
            >
              User Login
            </UBadge>
          </div>

          <UCard class="border-default/70 bg-elevated/90 shadow-sm">
            <div class="pb-3">
              <h3 class="text-base">
                账号登录
              </h3>
              <p>
                支持邮箱或用户名登录。
              </p>
            </div>

            <div>
              <form
                class="grid gap-4"
                @submit.prevent="submit"
              >
                <div class="grid gap-2">
                  <label for="identifier">
                    邮箱或用户名
                  </label>
                  <UInput
                    id="identifier"
                    v-model="form.identifier"
                    type="text"
                    autocomplete="username"
                    placeholder="you@example.com"
                  />
                </div>

                <div class="grid gap-2">
                  <label for="password">
                    密码
                  </label>
                  <UInput
                    id="password"
                    v-model="form.password"
                    type="password"
                    autocomplete="current-password"
                    placeholder="输入你的密码"
                  />
                </div>

                <div v-if="errorMessage">
                  <UBadge
                    color="error"
                    class="max-w-full whitespace-normal break-words"
                  >
                    {{ errorMessage }}
                  </UBadge>
                </div>

                <div class="flex flex-wrap gap-2">
                  <UButton
                    type="submit"
                    :disabled="submitting"
                  >
                    {{ submitting ? '登录中...' : '登录' }}
                  </UButton>
                  <UButton
                    to="/register"
                    variant="outline"
                  >
                    创建账号
                  </UButton>
                </div>
              </form>
            </div>
          </UCard>

          <p class="auth-note">
            忘记密码？请联系管理员处理。
          </p>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>OpenAPI 控制台</h3>
        <p>实时掌握接口调用状态、性能与配额使用情况。</p>
        <div class="auth-chip">
          API Monitor · Rate Guard · Audit Log
        </div>
      </div>
    </div>
  </div>
</template>
