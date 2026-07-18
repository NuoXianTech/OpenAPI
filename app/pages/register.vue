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

definePageMeta({ layout: false })

const { t } = useI18n()
const validationMessages = useAuthValidationMessages()
useHead(() => ({ title: t('auth.register.title') }))

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
    usernameError('username', state.username, validationMessages.value.username),
    emailError('email', state.email, validationMessages.value.email),
    passwordError('password', state.password, validationMessages.value.password),
    confirmationError(
      'confirm',
      state.confirm,
      state.password ?? '',
      validationMessages.value.confirmation
    )
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
    label: t('auth.fields.username'),
    placeholder: 'openapi_user',
    help: t('auth.register.usernameHelp'),
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
    label: t('auth.fields.email'),
    placeholder: t('auth.placeholders.email'),
    autocomplete: 'email',
    icon: 'i-mdi-email-outline',
    defaultValue: '',
    size: 'lg' as const,
    required: true
  },
  {
    name: 'password',
    type: 'password' as const,
    label: t('auth.fields.password'),
    placeholder: t('auth.placeholders.newPassword'),
    autocomplete: 'new-password',
    icon: 'i-mdi-lock-outline',
    defaultValue: '',
    size: 'lg' as const,
    required: true
  },
  {
    name: 'confirm',
    type: 'password' as const,
    label: t('auth.fields.confirmPassword'),
    placeholder: t('auth.placeholders.confirmPassword'),
    autocomplete: 'new-password',
    icon: 'i-mdi-lock-check-outline',
    defaultValue: '',
    size: 'lg' as const,
    required: true
  }
])

const registerErrorCodes = computed<Record<number, string>>(() => ({
  403: t('auth.register.errors.forbidden'),
  409: t('auth.register.errors.conflict'),
  429: t('auth.register.errors.tooManyRequests'),
  503: t('auth.register.errors.mailUnavailable'),
  500: t('auth.register.errors.server')
}))

const submitConfig = computed(() => ({
  label: t('auth.register.submit'),
  size: 'lg' as const,
  disabled: (turnstileRequired.value && !turnstileToken.value) || (consentRequired.value && !consent.value)
}))

const footerLinks = computed(() => [
  { label: t('auth.register.loginDirectly'), to: '/login' },
  { label: t('common.actions.backHome'), to: '/' }
])

async function onSubmit(event: FormSubmitEvent<RegisterFormState>) {
  errorMessage.value = ''
  successMessage.value = ''
  turnstileError.value = ''

  if (consentRequired.value && !consent.value) {
    errorMessage.value = t('auth.validation.consentRequired')
    return
  }

  if (turnstileRequired.value && !turnstileToken.value) {
    errorMessage.value = t('auth.validation.turnstileRequired')
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
      ? t('auth.register.successActivation')
      : t('auth.register.successDirect')
    if (authForm.value?.state) {
      authForm.value.state.password = ''
      authForm.value.state.confirm = ''
    }
    turnstileWidget.value?.reset()
  } catch (error: unknown) {
    errorMessage.value = parseFetchError(error, t('auth.register.failed'), registerErrorCodes.value)
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
      :title="t('auth.register.heading', { siteName: settings.siteName })"
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
        :submit="submitConfig"
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
      :prefix="t('auth.register.hasAccount')"
      :links="footerLinks"
    />
  </CommonAppAuthShell>
</template>
