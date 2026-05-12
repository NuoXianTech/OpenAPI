<script lang="ts" setup>
import { z } from 'zod'
import { registerSchema } from '#shared/schemas/auth'
import type { FormSubmitEvent } from '@nuxt/ui'

useHead({ title: '注册' })

definePageMeta({ layout: false })

const { register } = useAuth()
const { turnstile, settings } = useSiteSettings()

const schema = registerSchema
  .omit({ turnstileToken: true })
  .extend({ confirm: z.string().min(1, '请再次输入密码') })
  .refine(d => d.password === d.confirm, {
    path: ['confirm'],
    message: '两次输入的密码不一致'
  })

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  username: '',
  email: '',
  password: '',
  confirm: ''
})

const errorMessage = ref('')
const successMessage = ref('')
const submitting = ref(false)
const passwordVisible = ref(false)
const confirmVisible = ref(false)
const turnstileToken = ref('')
const turnstileWidget = ref<{ reset: () => void } | null>(null)
const turnstileRequired = computed(() => turnstile.value.register)

const passwordStrength = computed(() => {
  const v = state.password
  if (!v) return { label: '', color: 'neutral', value: 0 }
  let score = 0
  if (v.length >= 8) score += 1
  if (v.length >= 12) score += 1
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score += 1
  if (/\d/.test(v)) score += 1
  if (/[^A-Za-z0-9]/.test(v)) score += 1
  if (score <= 2) return { label: '弱', color: 'error' as const, value: 33 }
  if (score <= 3) return { label: '中', color: 'warning' as const, value: 66 }
  return { label: '强', color: 'success' as const, value: 100 }
})

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = ''
  successMessage.value = ''

  if (turnstileRequired.value && !turnstileToken.value) {
    errorMessage.value = '请先完成人机验证'
    return
  }

  submitting.value = true
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
    state.password = ''
    state.confirm = ''
    turnstileWidget.value?.reset()
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '注册失败')
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
          name="i-mdi-account-plus-outline"
          size="26"
        />
      </div>
      <div>
        <h1 class="auth-brand__title">
          创建 {{ settings.siteName }} 账号
        </h1>
        <p class="auth-brand__subtitle">
          注册完成后将通过邮箱进行验证，验证通过即可使用
        </p>
      </div>
    </div>

    <UCard
      variant="outline"
      class="auth-card"
      :ui="{ body: 'p-6 sm:p-7' }"
    >
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        action="javascript:void(0)"
        @submit="onSubmit"
      >
        <UFormField
          label="用户名"
          name="username"
          help="3-32 位，可包含字母、数字、下划线和短横线"
          required
        >
          <UInput
            v-model="state.username"
            type="text"
            autocomplete="username"
            placeholder="openapi_user"
            icon="i-mdi-account-outline"
            size="lg"
            class="w-full"
            autofocus
          />
        </UFormField>

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
            autocomplete="new-password"
            placeholder="设置不少于 8 位的登录密码"
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
          <Transition name="state-fade">
            <div
              v-if="state.password"
              class="mt-2"
            >
              <UProgress
                :model-value="passwordStrength.value"
                :color="passwordStrength.color"
                size="xs"
              />
              <p class="mt-1 text-xs text-muted">
                密码强度：<span :class="`text-[var(--${passwordStrength.color === 'success' ? 'green' : passwordStrength.color === 'warning' ? 'gray' : 'red'})]`">{{ passwordStrength.label }}</span>
              </p>
            </div>
          </Transition>
        </UFormField>

        <UFormField
          label="确认密码"
          name="confirm"
          required
        >
          <UInput
            v-model="state.confirm"
            :type="confirmVisible ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="再次输入密码"
            icon="i-mdi-lock-check-outline"
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
                :icon="confirmVisible ? 'i-mdi-eye-off-outline' : 'i-mdi-eye-outline'"
                :aria-label="confirmVisible ? '隐藏密码' : '显示密码'"
                @click="confirmVisible = !confirmVisible"
              />
            </template>
          </UInput>
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

        <Transition name="state-fade">
          <div
            v-if="successMessage"
            class="auth-message auth-message--success"
          >
            <Icon
              name="i-mdi-check-circle-outline"
              size="16"
              class="auth-message__icon"
            />
            <span>{{ successMessage }}</span>
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
          创建账号
        </UButton>
      </UForm>
    </UCard>

    <div class="auth-footer-links">
      <span>已有账号？</span>
      <UButton
        variant="link"
        size="sm"
        to="/login"
        class="px-0"
      >
        直接登录
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
