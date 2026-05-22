<script lang="ts" setup>
import { requestPasswordResetSchema, type RequestPasswordResetInput } from '#shared/schemas/auth'
import { parseFetchError } from '#shared/utils/clientError'
import type { FormSubmitEvent } from '@nuxt/ui'

useHead({ title: '找回密码' })

definePageMeta({ layout: false })

const { turnstile, passwordResetEnabled } = useSiteSettings()

const schema = requestPasswordResetSchema.omit({ turnstileToken: true })
type Schema = Omit<RequestPasswordResetInput, 'turnstileToken'>

const authForm = ref<{ state: Schema } | null>(null)

const errorMessage = ref('')
const submitted = ref(false)
const submittedEmail = ref('')
const submitting = ref(false)
const turnstileToken = ref('')
const turnstileWidget = ref<{ reset: () => void } | null>(null)
const turnstileRequired = computed(() => turnstile.value.passwordReset)

const fields = computed(() => [
  {
    name: 'email',
    type: 'email' as const,
    label: '邮箱',
    placeholder: 'you@example.com',
    autocomplete: 'email',
    icon: 'i-mdi-email-outline',
    size: 'lg' as const,
    required: true,
    autofocus: true
  }
])

const FORGOT_PASSWORD_ERROR_CODES: Record<number, string> = {
  403: '该功能已被管理员关闭',
  429: '操作过于频繁，请稍后再试',
  500: '服务器暂时无法响应，请稍后再试'
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = ''

  if (turnstileRequired.value && !turnstileToken.value) {
    errorMessage.value = '请先完成人机验证'
    return
  }

  submitting.value = true
  try {
    await $fetch('/api/auth/request-password-reset', {
      method: 'POST',
      body: {
        email: event.data.email,
        turnstileToken: turnstileRequired.value ? turnstileToken.value : undefined
      }
    })
    submittedEmail.value = event.data.email
    submitted.value = true
  } catch (error: unknown) {
    errorMessage.value = parseFetchError(error, '提交失败，请稍后重试', FORGOT_PASSWORD_ERROR_CODES)
    turnstileWidget.value?.reset()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <CommonAppAuthShell>
    <AuthBrandHeader
      icon="i-mdi-lock-reset"
      title="找回密码"
      subtitle="输入注册时使用的邮箱，我们会发送重置链接到该邮箱"
    />

    <UCard
      variant="outline"
      class="auth-card"
      :ui="{ body: 'p-6 sm:p-7' }"
    >
      <div
        v-if="!passwordResetEnabled"
        class="space-y-4"
      >
        <div class="auth-message auth-message--error">
          <UIcon
            name="i-mdi-alert-circle-outline"
            class="auth-message__icon size-4"
          />
          <span>该功能已被管理员关闭，请联系管理员协助处理。</span>
        </div>
        <UButton
          to="/login"
          variant="outline"
          color="neutral"
          block
          size="lg"
          icon="i-mdi-arrow-left"
        >
          返回登录
        </UButton>
      </div>

      <div
        v-else-if="submitted"
        class="space-y-4 text-center"
      >
        <div class="auth-success-illustration">
          <UIcon
            name="i-mdi-email-fast-outline"
            class="size-11"
          />
        </div>
        <div>
          <h3 class="text-base font-semibold text-highlighted">
            邮件已发送
          </h3>
          <p class="text-sm text-muted mt-1.5 leading-relaxed">
            如果 <span class="font-medium text-default">{{ submittedEmail }}</span> 已注册，<br>
            我们已向其发送了密码重置链接，请在 30 分钟内查收并完成重置。
          </p>
        </div>
        <UButton
          to="/login"
          block
          size="lg"
          icon="i-mdi-arrow-left"
        >
          返回登录
        </UButton>
      </div>

      <UAuthForm
        v-else
        ref="authForm"
        :schema="schema"
        :fields="fields"
        :loading="submitting"
        :submit="{ label: '发送重置链接', size: 'lg', disabled: turnstileRequired && !turnstileToken }"
        @submit="onSubmit"
      >
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

          <CommonTurnstileWidget
            v-if="turnstileRequired"
            ref="turnstileWidget"
            v-model:token="turnstileToken"
            :site-key="turnstile.siteKey"
          />
        </template>
      </UAuthForm>
    </UCard>

    <AuthFooterLinks
      :links="[
        { label: '返回登录', to: '/login' },
        { label: '返回首页', to: '/' }
      ]"
    />
  </CommonAppAuthShell>
</template>
