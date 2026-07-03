<script lang="ts" setup>
import { z } from 'zod'
import type { ResetPasswordInput } from '#shared/schemas/auth'
import { parseFetchError } from '#shared/utils/client-error'
import { minMessage, requiredMessage } from '#shared/schemas/validation'
import type { FormSubmitEvent } from '@nuxt/ui'

useHead({ title: '重置密码' })

definePageMeta({ layout: false })

const route = useRoute()
const toast = useToast()

const userId = computed(() => Number((route.query.user || '').toString()) || 0)
const token = computed(() => (route.query.token || '').toString())
const linkValid = computed(() => userId.value > 0 && token.value.length > 0)

const schema = z.object({
  password: z.string().min(8, minMessage('密码', 8)),
  confirm: z.string().min(1, requiredMessage('确认密码'))
}).refine(d => d.password === d.confirm, {
  path: ['confirm'],
  message: '两次输入的密码不一致'
})

type Schema = z.output<typeof schema>

const authForm = ref<{ state: Schema } | null>(null)
const passwordValue = computed(() => authForm.value?.state?.password ?? '')

const errorMessage = ref('')
const isSubmitting = ref(false)
const success = ref(false)

const fields = computed(() => [
  {
    name: 'password',
    type: 'password' as const,
    label: '新密码',
    placeholder: '设置新密码（至少 8 位）',
    autocomplete: 'new-password',
    icon: 'i-mdi-lock-outline',
    size: 'lg' as const,
    required: true,
    autofocus: true
  },
  {
    name: 'confirm',
    type: 'password' as const,
    label: '确认新密码',
    placeholder: '再次输入新密码',
    autocomplete: 'new-password',
    icon: 'i-mdi-lock-check-outline',
    size: 'lg' as const,
    required: true
  }
])

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = ''

  isSubmitting.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: {
        userId: userId.value,
        token: token.value,
        newPassword: event.data.password
      } satisfies ResetPasswordInput
    })
    success.value = true
    toast.add({ title: '密码已重置，请使用新密码登录', color: 'success' })
    await new Promise(resolve => setTimeout(resolve, 800))
    await navigateTo('/login')
  } catch (error: unknown) {
    errorMessage.value = parseFetchError(error, '重置失败，链接可能已失效')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <CommonAppAuthShell>
    <AuthBrandHeader
      icon="i-mdi-lock-reset"
      title="重置密码"
      subtitle="请为账号设置新的登录密码，密码至少 8 位"
    />

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
          <UIcon
            name="i-mdi-link-variant-off"
            class="auth-message__icon size-4"
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
          <UIcon
            name="i-mdi-check"
            class="size-11"
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

      <UAuthForm
        v-else
        ref="authForm"
        :schema="schema"
        :fields="fields"
        :loading="isSubmitting"
        :submit="{ label: '重置密码', size: 'lg' }"
        @submit="onSubmit"
      >
        <template #password-help>
          <AuthPasswordStrength :password="passwordValue" />
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
