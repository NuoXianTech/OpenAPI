<script lang="ts" setup>
import { requestPasswordResetSchema, type RequestPasswordResetInput } from '#shared/schemas/auth'
import type { FormSubmitEvent } from '@nuxt/ui'

useHead({ title: '找回密码' })

definePageMeta({ layout: false })

const { turnstile, passwordResetEnabled } = useSiteSettings()

const schema = requestPasswordResetSchema.omit({ turnstileToken: true })
type Schema = Omit<RequestPasswordResetInput, 'turnstileToken'>

const state = reactive<Schema>({
  email: ''
})
const errorMessage = ref('')
const submitted = ref(false)
const submitting = ref(false)
const turnstileToken = ref('')
const turnstileWidget = ref<{ reset: () => void } | null>(null)
const turnstileRequired = computed(() => turnstile.value.passwordReset)

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
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
    submitted.value = true
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '提交失败，请稍后重试')
    turnstileWidget.value?.reset()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <CommonAppAuthShell>
    <div class="auth-brand">
      <div class="auth-brand__logo">
        <Icon
          name="i-mdi-lock-reset"
          size="26"
        />
      </div>
      <div>
        <h1 class="auth-brand__title">
          找回密码
        </h1>
        <p class="auth-brand__subtitle">
          输入注册时使用的邮箱，我们会发送重置链接到该邮箱
        </p>
      </div>
    </div>

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
          <Icon
            name="i-mdi-alert-circle-outline"
            size="16"
            class="auth-message__icon"
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
          <Icon
            name="i-mdi-email-fast-outline"
            size="44"
          />
        </div>
        <div>
          <h3 class="text-base font-semibold text-highlighted">
            邮件已发送
          </h3>
          <p class="text-sm text-muted mt-1.5 leading-relaxed">
            如果 <span class="font-medium text-default">{{ state.email }}</span> 已注册，<br>
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

      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="space-y-4"
        action="javascript:void(0)"
        @submit="onSubmit"
      >
        <UFormField
          label="邮箱"
          name="email"
          required
        >
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            icon="i-mdi-email-outline"
            size="lg"
            class="w-full"
            autofocus
          />
        </UFormField>

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
          发送重置链接
        </UButton>
      </UForm>
    </UCard>

    <div class="auth-footer-links">
      <UButton
        variant="link"
        size="sm"
        to="/login"
        class="px-0"
      >
        返回登录
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
</template>

<style scoped>
.auth-success-illustration {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  margin: 0 auto 4px;
  color: var(--green);
  background: color-mix(in srgb, var(--green) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--green) 22%, transparent);
}
</style>
