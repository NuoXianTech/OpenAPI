<script lang="ts" setup>
import { z } from 'zod'
import type { ResetPasswordInput } from '#shared/schemas/auth'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: false })

const route = useRoute()
const toast = useToast()

const userId = computed(() => Number((route.query.user || '').toString()) || 0)
const token = computed(() => (route.query.token || '').toString())
const linkValid = computed(() => userId.value > 0 && token.value.length > 0)

const schema = z.object({
  password: z.string().min(8, '密码至少 8 位'),
  confirm: z.string().min(1, '请再次输入密码'),
}).refine(d => d.password === d.confirm, {
  path: ['confirm'],
  message: '两次输入的密码不一致',
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  password: '',
  confirm: '',
})
const errorMessage = ref('')
const submitting = ref(false)
const success = ref(false)
const passwordVisible = ref(false)
const confirmVisible = ref(false)

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
  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) {
      return data.message
    }
  }
  return fallback
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = ''

  submitting.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: {
        userId: userId.value,
        token: token.value,
        newPassword: event.data.password,
      } satisfies ResetPasswordInput,
    })
    success.value = true
    toast.add({ title: '密码已重置，请使用新密码登录', color: 'success' })
    await new Promise(resolve => setTimeout(resolve, 800))
    await navigateTo('/login')
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '重置失败，链接可能已失效')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UApp>
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
            重置密码
          </h1>
          <p class="auth-brand__subtitle">
            请为账号设置新的登录密码，密码至少 8 位
          </p>
        </div>
      </div>

      <UCard
        variant="outline"
        class="auth-card"
        :ui="{ body: 'p-6 sm:p-7' }"
      >
        <div
          v-if="!linkValid"
          class="space-y-4"
        >
          <div class="auth-message auth-message--error">
            <Icon
              name="i-mdi-link-variant-off"
              size="16"
              class="auth-message__icon"
            />
            <span>重置链接无效或已损坏，请重新申请。</span>
          </div>
          <UButton
            to="/forgot-password"
            block
            size="lg"
            icon="i-mdi-refresh"
          >
            重新申请
          </UButton>
        </div>

        <div
          v-else-if="success"
          class="space-y-4 text-center"
        >
          <div class="auth-success-illustration">
            <Icon
              name="i-mdi-check"
              size="44"
            />
          </div>
          <div>
            <h3 class="text-base font-semibold text-highlighted">
              重置成功
            </h3>
            <p class="text-sm text-muted mt-1.5">
              密码已更新，正在跳转到登录页...
            </p>
          </div>
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
            label="新密码"
            name="password"
            required
          >
            <UInput
              v-model="state.password"
              :type="passwordVisible ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="设置新密码（至少 8 位）"
              icon="i-mdi-lock-outline"
              size="lg"
              class="w-full"
              autofocus
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
            label="确认新密码"
            name="confirm"
            required
          >
            <UInput
              v-model="state.confirm"
              :type="confirmVisible ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="再次输入新密码"
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

          <UButton
            type="submit"
            block
            size="lg"
            :loading="submitting"
          >
            重置密码
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
  </UApp>
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
