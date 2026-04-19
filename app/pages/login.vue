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
    provider_not_supported: '暂不支持该 Provider，仅支持 GitHub / QQ',
    provider_not_implemented: '暂不支持该 Provider',
    oauth_disabled: '第三方登录已关闭',
    binding_required: '请先注册本站账号后再使用第三方登录',
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
  <div class="min-h-screen bg-default flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center size-12 rounded-xl bg-elevated border border-default mb-3">
          <Icon
            name="mdi:account-circle-outline"
            size="24"
          />
        </div>
        <h1 class="text-xl font-semibold">
          欢迎回来
        </h1>
        <p class="text-sm text-muted mt-1">
          使用邮箱或用户名登录你的账号
        </p>
      </div>

      <UCard class="shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
        <div
          v-if="checkingAuth"
          class="space-y-3 p-1"
        >
          <USkeleton class="h-10 w-full rounded-md" />
          <USkeleton class="h-10 w-full rounded-md" />
          <USkeleton class="h-10 w-full rounded-md" />
        </div>

        <form
          v-else
          class="space-y-4 p-1"
          @submit.prevent="submit"
        >
          <UFormField label="邮箱或用户名">
            <UInput
              v-model="form.identifier"
              type="text"
              autocomplete="username"
              placeholder="you@example.com"
              icon="i-mdi-account-outline"
              autofocus
            />
          </UFormField>

          <UFormField label="密码">
            <UInput
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              icon="i-mdi-lock-outline"
            />
          </UFormField>

          <div
            v-if="errorMessage"
            class="text-sm text-[var(--red)] bg-[var(--red)]/5 rounded-lg px-3 py-2"
          >
            {{ errorMessage }}
          </div>

          <div
            v-if="oauthError"
            class="text-sm text-[var(--red)] bg-[var(--red)]/5 rounded-lg px-3 py-2"
          >
            {{ oauthError }}
          </div>

          <UButton
            type="submit"
            block
            :loading="submitting"
          >
            登录
          </UButton>

          <div
            v-if="providers.length"
            class="pt-3 border-t border-default space-y-2"
          >
            <p class="text-xs text-muted text-center">
              或使用第三方登录
            </p>
            <div class="grid gap-2">
              <UButton
                v-for="p in providers"
                :key="p.provider"
                type="button"
                variant="outline"
                block
                :icon="p.icon || 'i-mdi-account-circle-outline'"
                @click="gotoOAuth(p.authorizeEntry)"
              >
                {{ p.displayName }}
              </UButton>
            </div>
          </div>
        </form>
      </UCard>

      <div class="flex items-center justify-center gap-2 mt-4">
        <UButton
          variant="link"
          size="sm"
          to="/register"
          class="text-muted"
        >
          创建账号
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
