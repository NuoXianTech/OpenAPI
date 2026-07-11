<script setup lang="ts">
import { parseFetchError } from '~/utils/client-error'
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import {
  compactFormErrors,
  confirmationError,
  emailError,
  passwordError,
  usernameError
} from '~/utils/form-validation'

useHead({ title: '注册' })

definePageMeta({ layout: false })

const { register } = useAuth()
const { turnstile, settings } = useSiteSettings()

interface RegisterFormState {
  username: string
  email: string
  password: string
  confirm: string
}

function validateRegisterForm(state: Partial<RegisterFormState>): FormError<string>[] {
  return compactFormErrors(
    usernameError('username', state.username),
    emailError('email', state.email),
    passwordError('password', state.password),
    confirmationError('confirm', state.confirm, state.password ?? '')
  )
}

const authForm = ref<{ state: RegisterFormState } | null>(null)
const passwordValue = computed(() => authForm.value?.state?.password ?? '')

const errorMessage = ref('')
const successMessage = ref('')
const turnstileError = ref('')
const isSubmitting = ref(false)
const turnstileToken = ref('')
const turnstileWidget = ref<{ reset: () => void } | null>(null)
const turnstileRequired = computed(() => turnstile.value.register)

// 配置了服务条款 / 隐私政策时，注册前必须勾选同意
const consent = ref(false)
const consentRequired = computed(() => Boolean(settings.value.termsUrl || settings.value.privacyUrl))

const fields = computed(() => [
  {
    name: 'username',
    type: 'text' as const,
    label: '用户名',
    placeholder: 'openapi_user',
    help: '3-32 位，可包含字母、数字、下划线和短横线',
    autocomplete: 'username',
    icon: 'i-mdi-account-outline',
    defaultValue: '',
    size: 'lg' as const,
    required: true,
    autofocus: true
  },
  {
    name: 'email',
    type: 'email' as const,
    label: '邮箱',
    placeholder: 'you@example.com',
    autocomplete: 'email',
    icon: 'i-mdi-email-outline',
    defaultValue: '',
    size: 'lg' as const,
    required: true
  },
  {
    name: 'password',
    type: 'password' as const,
    label: '密码',
    placeholder: '设置不少于 8 位的登录密码',
    autocomplete: 'new-password',
    icon: 'i-mdi-lock-outline',
    defaultValue: '',
    size: 'lg' as const,
    required: true
  },
  {
    name: 'confirm',
    type: 'password' as const,
    label: '确认密码',
    placeholder: '再次输入密码',
    autocomplete: 'new-password',
    icon: 'i-mdi-lock-check-outline',
    defaultValue: '',
    size: 'lg' as const,
    required: true
  }
])

const REGISTER_ERROR_CODES: Record<number, string> = {
  403: '当前未开放注册或邮箱不被允许',
  409: '该邮箱或用户名已被占用，请更换后重试',
  429: '操作过于频繁，请稍后再试',
  503: '验证邮件服务暂不可用，请稍后再试或联系管理员',
  500: '服务器暂时无法响应，请稍后再试'
}

async function onSubmit(event: FormSubmitEvent<RegisterFormState>) {
  errorMessage.value = ''
  successMessage.value = ''
  turnstileError.value = ''

  if (consentRequired.value && !consent.value) {
    errorMessage.value = '请先阅读并同意服务条款和隐私政策'
    return
  }

  if (turnstileRequired.value && !turnstileToken.value) {
    errorMessage.value = '请先完成人机验证'
    return
  }

  isSubmitting.value = true
  try {
    const res = await register({
      username: event.data.username,
      email: event.data.email,
      password: event.data.password,
      turnstileToken: turnstileRequired.value ? turnstileToken.value : undefined
    })
    successMessage.value = res.verificationRequired
      ? '账号已创建，请查收邮箱完成验证后再登录。'
      : '账号创建成功，可以直接登录。'
    if (authForm.value?.state) {
      authForm.value.state.password = ''
      authForm.value.state.confirm = ''
    }
    turnstileWidget.value?.reset()
  } catch (error: unknown) {
    errorMessage.value = parseFetchError(error, '注册失败', REGISTER_ERROR_CODES)
    turnstileWidget.value?.reset()
  } finally {
    isSubmitting.value = false
  }
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
      icon="i-mdi-account-plus-outline"
      :title="`创建 ${settings.siteName} 账号`"
      subtitle="注册完成后将通过邮箱进行验证，验证通过即可使用"
    />

    <UCard
      variant="outline"
      class="auth-card"
      :ui="{ body: 'p-4 sm:p-7' }"
    >
      <UAuthForm
        ref="authForm"
        :validate="validateRegisterForm"
        :fields="fields"
        :loading="isSubmitting"
        :submit="{ label: '创建账号', size: 'lg', disabled: (turnstileRequired && !turnstileToken) || (consentRequired && !consent) }"
        @submit="onSubmit"
      >
        <template #password-help>
          <AuthPasswordStrength :password="passwordValue" />
        </template>

        <template #validation>
          <div
            v-if="consentRequired"
            class="auth-form-options"
          >
            <AuthConsent v-model="consent" />
          </div>

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
              v-if="successMessage"
              class="auth-message auth-message--success"
            >
              <UIcon
                name="i-mdi-check-circle-outline"
                class="auth-message__icon size-4"
              />
              <span>{{ successMessage }}</span>
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
      prefix="已有账号？"
      :links="[
        { label: '直接登录', to: '/login' },
        { label: '返回首页', to: '/' }
      ]"
    />
  </CommonAppAuthShell>
</template>
