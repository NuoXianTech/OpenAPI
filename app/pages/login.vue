<script lang="ts" setup>
const { fetchMe, user, login } = useAuth()
const route = useRoute()
const form = reactive({
  identifier: '',
  password: '',
})
const errorMessage = ref('')
const submitting = ref(false)
const checkingAuth = ref(true)

const { data: providersData } = await useFetch<{ code: number, data: Array<{ provider: string, displayName: string, icon: string | null, authorizeEntry: string }> }>('/api/auth/providers/list', {
  default: () => ({ code: 0, msg: '', data: [] }),
})
const providers = computed(() => providersData.value?.data || [])

const oauthError = computed(() => {
  const code = (route.query.oauth_error || '').toString()
  if (!code) {
    return ''
  }
  const map: Record<string, string> = {
    state_mismatch: 'OAuth 状态校验失败，请重试',
    missing_code: '未拿到授权码，请重试',
    provider_unavailable: 'Provider 不可用',
    provider_not_implemented: '暂不支持该 Provider',
    email_required: '该账号未提供邮箱，无法创建',
    user_banned: '该用户已被封禁',
    user_unavailable: '用户不可用',
    secret_decrypt_failed: 'Provider 密钥配置异常',
    user_create_failed: '用户创建失败',
    callback_failed: 'OAuth 回调失败，请重试',
  }
  return map[code] || `登录失败：${code}`
})

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

function gotoOAuth(entry: string) {
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.href = `${entry}?returnTo=${returnTo}`
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

                <div v-if="oauthError">
                  <UBadge
                    color="error"
                    class="max-w-full whitespace-normal break-words"
                  >
                    {{ oauthError }}
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

                <div
                  v-if="providers.length"
                  class="grid gap-2 pt-2 border-t border-default/60"
                >
                  <p class="text-xs text-muted">
                    或使用第三方登录
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <UButton
                      v-for="p in providers"
                      :key="p.provider"
                      type="button"
                      variant="outline"
                      :icon="p.icon || 'i-mdi-account-circle-outline'"
                      @click="gotoOAuth(p.authorizeEntry)"
                    >
                      {{ p.displayName }}
                    </UButton>
                  </div>
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
