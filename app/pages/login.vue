<script lang="ts" setup>
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: false })

const { fetchMe, user, login } = useAuth()
const { turnstile, passwordResetEnabled, settings } = useSiteSettings()
const route = useRoute()

const schema = z.object({
  identifier: z.string().min(1, '请输入邮箱或用户名'),
  password: z.string().min(1, '请输入密码'),
})
type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  identifier: '',
  password: '',
})

const remember = ref(false)
const errorMessage = ref('')
const submitting = ref(false)
const checkingAuth = ref(true)
const passwordVisible = ref(false)
const turnstileToken = ref('')
const turnstileWidget = ref<{ reset: () => void } | null>(null)
const turnstileRequired = computed(() => turnstile.value.login)

const { data: providersData } = useLazyFetch<Array<{ provider: string, displayName: string, icon: string | null, authorizeEntry: string }>>('/api/auth/providers/list', {
  default: () => [],
})
const providers = computed(() => providersData.value || [])

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
    email_not_allowed: '该邮箱不在允许注册的列表内',
    user_banned: '该用户已被封禁',
    user_unavailable: '用户不可用',
    secret_decrypt_failed: 'Provider 密钥配置异常',
    user_create_failed: '用户创建失败',
    callback_failed: 'OAuth 回调失败，请重试',
  }
  return map[code] || `登录失败：${code}`
})

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const data = (error as { data?: { message?: unknown } }).data
    if (data && typeof data.message === 'string' && data.message) {
      return data.message
    }
  }
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

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = ''

  if (turnstileRequired.value && !turnstileToken.value) {
    errorMessage.value = '请先完成人机验证'
    return
  }

  submitting.value = true
  try {
    const base = event.data.identifier.includes('@')
      ? { email: event.data.identifier, password: event.data.password }
      : { username: event.data.identifier, password: event.data.password }
    const withRemember = { ...base, remember: remember.value }
    const payload = turnstileRequired.value
      ? { ...withRemember, turnstileToken: turnstileToken.value }
      : withRemember

    await login(payload)
    await navigateTo('/')
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '登录失败')
    turnstileWidget.value?.reset()
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
  <UApp>
    <CommonAppAuthShell>
      <div class="auth-brand">
        <div class="auth-brand__logo">
          <Icon
            name="i-mdi-account-circle-outline"
            size="26"
          />
        </div>
        <div>
          <h1 class="auth-brand__title">
            欢迎回到 {{ settings.siteName }}
          </h1>
          <p class="auth-brand__subtitle">
            使用邮箱或用户名登录，开始调用接口
          </p>
        </div>
      </div>

      <UCard
        variant="outline"
        class="auth-card"
        :ui="{ body: 'p-6 sm:p-7' }"
      >
        <div
          v-if="checkingAuth"
          class="space-y-3"
        >
          <USkeleton class="h-11 w-full rounded-lg" />
          <USkeleton class="h-11 w-full rounded-lg" />
          <USkeleton class="h-11 w-full rounded-lg" />
        </div>

        <UForm
          v-else
          :schema="schema"
          :state="state"
          class="space-y-4"
          action="javascript:void(0)"
          @submit="onSubmit"
        >
          <UFormField
            label="邮箱或用户名"
            name="identifier"
            required
          >
            <UInput
              v-model="state.identifier"
              type="text"
              autocomplete="username"
              placeholder="you@example.com"
              icon="i-mdi-account-outline"
              size="lg"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UFormField
            label="密码"
            name="password"
            required
          >
            <UInput
              v-model="state.password"
              :type="passwordVisible ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入登录密码"
              icon="i-mdi-lock-outline"
              size="lg"
              class="w-full"
              :ui="{ trailing: 'pe-1' }"
            >
              <template #trailing>
                <UButton
                  type="button"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  :icon="passwordVisible ? 'i-mdi-eye-off-outline' : 'i-mdi-eye-outline'"
                  :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
                  @click="passwordVisible = !passwordVisible"
                />
              </template>
            </UInput>
          </UFormField>

          <div class="flex items-center justify-between -mt-1">
            <UCheckbox
              v-model="remember"
              label="记住我"
            />
            <UButton
              v-if="passwordResetEnabled"
              type="button"
              variant="link"
              size="xs"
              to="/forgot-password"
              class="text-muted px-0"
            >
              忘记密码？
            </UButton>
          </div>

          <Transition name="state-fade">
            <div
              v-if="errorMessage"
              class="auth-message auth-message--error"
            >
              <Icon
                name="i-mdi-alert-circle-outline"
                size="16"
                class="auth-message__icon"
              />
              <span>{{ errorMessage }}</span>
            </div>
          </Transition>

          <Transition name="state-fade">
            <div
              v-if="oauthError"
              class="auth-message auth-message--error"
            >
              <Icon
                name="i-mdi-alert-circle-outline"
                size="16"
                class="auth-message__icon"
              />
              <span>{{ oauthError }}</span>
            </div>
          </Transition>

          <CommonTurnstileWidget
            v-if="turnstileRequired"
            ref="turnstileWidget"
            v-model:token="turnstileToken"
            :site-key="turnstile.siteKey"
          />

          <UButton
            type="submit"
            block
            size="lg"
            :loading="submitting"
            :disabled="turnstileRequired && !turnstileToken"
          >
            登录
          </UButton>

          <template v-if="providers.length">
            <div class="auth-divider">
              或使用第三方登录
            </div>

            <div class="grid gap-2">
              <UButton
                v-for="p in providers"
                :key="p.provider"
                type="button"
                variant="outline"
                color="neutral"
                size="lg"
                block
                :icon="p.icon || 'i-mdi-account-circle-outline'"
                @click="gotoOAuth(p.authorizeEntry)"
              >
                使用 {{ p.displayName }} 登录
              </UButton>
            </div>
          </template>
        </UForm>
      </UCard>

      <div class="auth-footer-links">
        <span>还没有账号？</span>
        <UButton
          variant="link"
          size="sm"
          to="/register"
          class="px-0"
        >
          创建账号
        </UButton>
        <span class="text-dimmed">·</span>
        <UButton
          variant="link"
          size="sm"
          to="/"
          class="px-0"
        >
          返回首页
        </UButton>
      </div>
    </CommonAppAuthShell>
  </UApp>
</template>
