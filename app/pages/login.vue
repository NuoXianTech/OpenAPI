<script lang="ts" setup>
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { parseFetchError } from '#shared/utils/clientError'
import { ADMIN_OVERVIEW_PATH } from '~/constants/admin-sections/overview'
import { USER_OVERVIEW_PATH } from '~/constants/user-sections/overview'

useHead({ title: '登录' })

definePageMeta({ layout: false })

const { fetchMe, user, login } = useAuth()
const { turnstile, passwordResetEnabled, settings } = useSiteSettings()
const route = useRoute()

const schema = z.object({
  identifier: z.string().min(1, '请输入邮箱或用户名'),
  password: z.string().min(1, '请输入密码'),
  remember: z.boolean().optional()
})
type Schema = z.output<typeof schema>

const errorMessage = ref('')
const turnstileError = ref('')
const submitting = ref(false)
const checkingAuth = ref(true)
const turnstileToken = ref('')
const turnstileWidget = ref<{ reset: () => void } | null>(null)
const turnstileRequired = computed(() => turnstile.value.login)

const { data: providersData } = useLazyFetch<Array<{ provider: string, displayName: string, icon: string | null, authorizeEntry: string }>>('/api/auth/providers/list', {
  default: () => []
})

const providers = computed(() => (providersData.value || []).map(p => ({
  label: `使用 ${p.displayName} 登录`,
  icon: p.icon || 'i-mdi-account-circle-outline',
  color: 'neutral' as const,
  variant: 'outline' as const,
  size: 'lg' as const,
  onClick: () => gotoOAuth(p.authorizeEntry)
})))

const fields = computed(() => [
  {
    name: 'identifier',
    type: 'text' as const,
    label: '邮箱或用户名',
    placeholder: 'you@example.com',
    autocomplete: 'username',
    icon: 'i-mdi-account-outline',
    size: 'lg' as const,
    required: true,
    autofocus: true
  },
  {
    name: 'password',
    type: 'password' as const,
    label: '密码',
    placeholder: '请输入登录密码',
    autocomplete: 'current-password',
    icon: 'i-mdi-lock-outline',
    size: 'lg' as const,
    required: true
  },
  {
    name: 'remember',
    type: 'checkbox' as const,
    label: '记住我'
  }
])

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
    callback_failed: 'OAuth 回调失败，请重试'
  }
  return map[code] || `登录失败：${code}`
})

const LOGIN_ERROR_CODES: Record<number, string> = {
  401: '账号或密码错误',
  403: '当前账号无法登录，请确认账号状态',
  429: '尝试次数过多，请稍后再试',
  500: '服务器暂时无法响应，请稍后再试'
}

onMounted(async () => {
  await fetchMe()
  if (user.value) {
    await navigateTo(user.value.kind === 'admin' ? ADMIN_OVERVIEW_PATH : USER_OVERVIEW_PATH)
    return
  }
  checkingAuth.value = false
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = ''
  turnstileError.value = ''

  if (turnstileRequired.value && !turnstileToken.value) {
    errorMessage.value = '请先完成人机验证'
    return
  }

  submitting.value = true
  try {
    const base = event.data.identifier.includes('@')
      ? { email: event.data.identifier, password: event.data.password }
      : { username: event.data.identifier, password: event.data.password }
    const withRemember = { ...base, remember: Boolean(event.data.remember) }
    const payload = turnstileRequired.value
      ? { ...withRemember, turnstileToken: turnstileToken.value }
      : withRemember

    await login(payload)
    await navigateTo(USER_OVERVIEW_PATH)
  } catch (error: unknown) {
    errorMessage.value = parseFetchError(error, '登录失败', LOGIN_ERROR_CODES)
    turnstileWidget.value?.reset()
  } finally {
    submitting.value = false
  }
}

function gotoOAuth(entry: string) {
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.href = `${entry}?returnTo=${returnTo}`
}

function onTurnstileError(message: string) {
  turnstileError.value = message
}

function clearTurnstileError() {
  turnstileError.value = ''
}
</script>

<template>
  <CommonAppAuthShell>
    <AuthBrandHeader
      icon="i-mdi-account-circle-outline"
      :title="`欢迎回到 ${settings.siteName}`"
      subtitle="使用邮箱或用户名登录，开始调用接口"
    />

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

      <UAuthForm
        v-else
        :schema="schema"
        :fields="fields"
        :providers="providers"
        :loading="submitting"
        :submit="{ label: '登录', size: 'lg', disabled: turnstileRequired && !turnstileToken }"
        separator="或使用第三方登录"
        @submit="onSubmit"
      >
        <template #password-hint>
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
        </template>

        <template #validation>
          <Transition name="state-fade">
            <div
              v-if="errorMessage"
              class="auth-message auth-message--error"
            >
              <UIcon
                name="i-mdi-alert-circle-outline"
                class="auth-message__icon size-4"
              />
              <span>{{ errorMessage }}</span>
            </div>
          </Transition>

          <Transition name="state-fade">
            <div
              v-if="oauthError"
              class="auth-message auth-message--error"
            >
              <UIcon
                name="i-mdi-alert-circle-outline"
                class="auth-message__icon size-4"
              />
              <span>{{ oauthError }}</span>
            </div>
          </Transition>

          <Transition name="state-fade">
            <div
              v-if="turnstileError"
              class="auth-message auth-message--error"
            >
              <UIcon
                name="i-mdi-alert-circle-outline"
                class="auth-message__icon size-4"
              />
              <span>{{ turnstileError }}</span>
            </div>
          </Transition>

          <CommonTurnstileWidget
            v-if="turnstileRequired"
            ref="turnstileWidget"
            v-model:token="turnstileToken"
            :site-key="turnstile.siteKey"
            @verified="clearTurnstileError"
            @expired="clearTurnstileError"
            @error="onTurnstileError"
          />
        </template>
      </UAuthForm>
    </UCard>

    <AuthFooterLinks
      prefix="还没有账号？"
      :links="[
        { label: '创建账号', to: '/register' },
        { label: '返回首页', to: '/' }
      ]"
    />
  </CommonAppAuthShell>
</template>
