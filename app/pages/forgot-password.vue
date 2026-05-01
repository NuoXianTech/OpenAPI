<script lang="ts" setup>
const { turnstile, passwordResetEnabled } = useSiteSettings()
const form = reactive({
  email: '',
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

const submit = async () => {
  errorMessage.value = ''

  if (turnstileRequired.value && !turnstileToken.value) {
    errorMessage.value = '请先完成人机验证'
    return
  }

  submitting.value = true
  try {
    await $fetch<{ code: number, msg: string }>('/api/auth/request-password-reset', {
      method: 'POST',
      body: {
        email: form.email,
        turnstileToken: turnstileRequired.value ? turnstileToken.value : undefined,
      },
    })
    submitted.value = true
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '提交失败，请稍后重试')
    turnstileWidget.value?.reset()
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-default flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center size-12 rounded-xl bg-elevated border border-default mb-3">
          <Icon
            name="mdi:lock-reset"
            size="24"
          />
        </div>
        <h1 class="text-xl font-semibold">
          找回密码
        </h1>
        <p class="text-sm text-muted mt-1">
          输入注册邮箱，我们会发送密码重置链接
        </p>
      </div>

      <UCard class="shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
        <div
          v-if="!passwordResetEnabled"
          class="space-y-3 p-1"
        >
          <div class="text-sm text-[var(--red)] bg-[var(--red)]/5 rounded-lg px-3 py-2">
            该功能已被管理员关闭，请联系管理员协助处理。
          </div>
          <UButton
            to="/login"
            variant="outline"
            block
          >
            返回登录
          </UButton>
        </div>

        <div
          v-else-if="submitted"
          class="space-y-3 p-1"
        >
          <div class="text-sm text-[var(--green)] bg-[var(--green)]/5 rounded-lg px-3 py-2">
            如果该邮箱已注册，我们已向其发送了密码重置链接，请在 30 分钟内查收并完成重置。
          </div>
          <UButton
            to="/login"
            block
          >
            返回登录
          </UButton>
        </div>

        <form
          v-else
          class="space-y-4 p-1"
          @submit.prevent="submit"
        >
          <UFormField label="邮箱">
            <UInput
              v-model="form.email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              icon="i-mdi-email-outline"
              autofocus
            />
          </UFormField>

          <div
            v-if="errorMessage"
            class="text-sm text-[var(--red)] bg-[var(--red)]/5 rounded-lg px-3 py-2"
          >
            {{ errorMessage }}
          </div>

          <CommonTurnstileWidget
            v-if="turnstileRequired"
            ref="turnstileWidget"
            v-model:token="turnstileToken"
            :site-key="turnstile.siteKey"
          />

          <UButton
            type="submit"
            block
            :loading="submitting"
            :disabled="turnstileRequired && !turnstileToken"
          >
            发送重置链接
          </UButton>
        </form>
      </UCard>

      <div class="flex items-center justify-center gap-2 mt-4">
        <UButton
          variant="link"
          size="sm"
          to="/login"
          class="text-muted"
        >
          返回登录
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
