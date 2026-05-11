<script lang="ts" setup>
definePageMeta({ layout: false })

const route = useRoute()
const token = computed(() => (route.query.token || '').toString())
const user = computed(() => (route.query.user || '').toString())

const status = ref<'pending' | 'success' | 'error'>('pending')
const message = ref('正在验证，请稍候...')
const verifying = ref(false)

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

const headerIcon = computed(() => {
  if (status.value === 'success') {
    return 'i-mdi-email-check-outline'
  }
  if (status.value === 'error') {
    return 'i-mdi-email-alert-outline'
  }
  return 'i-mdi-email-sync-outline'
})

const headerTitle = computed(() => {
  if (status.value === 'success') {
    return '验证成功'
  }
  if (status.value === 'error') {
    return '验证失败'
  }
  return '邮箱验证'
})

const headerSubtitle = computed(() => {
  if (status.value === 'success') {
    return '已自动登录，正在跳转首页'
  }
  if (status.value === 'error') {
    return '验证链接可能已失效，请重新获取'
  }
  return '正在校验验证链接，请稍候'
})

onMounted(async () => {
  if (verifying.value) {
    return
  }
  verifying.value = true

  if (!token.value || !user.value) {
    status.value = 'error'
    message.value = '验证链接无效'
    verifying.value = false
    return
  }

  status.value = 'pending'
  message.value = '正在验证，请稍候...'

  try {
    await $fetch('/api/auth/verify-email', {
      query: { token: token.value, user: user.value },
    })
    status.value = 'success'
    message.value = '验证成功，已自动登录，正在跳转首页...'
    await new Promise(resolve => setTimeout(resolve, 800))
    await navigateTo('/')
  }
  catch (error: unknown) {
    status.value = 'error'
    message.value = getErrorMessage(error, '验证失败')
  }
  finally {
    verifying.value = false
  }
})
</script>

<template>
  <UApp>
    <CommonAppAuthShell>
      <div class="auth-brand">
        <div class="auth-brand__logo">
          <Icon
            :name="headerIcon"
            size="26"
          />
        </div>
        <div>
          <h1 class="auth-brand__title">
            {{ headerTitle }}
          </h1>
          <p class="auth-brand__subtitle">
            {{ headerSubtitle }}
          </p>
        </div>
      </div>

      <UCard
        variant="outline"
        class="auth-card"
        :ui="{ body: 'p-6 sm:p-7' }"
      >
        <div
          v-if="status === 'pending'"
          class="space-y-4"
        >
          <div class="flex items-center gap-2 text-sm text-muted">
            <Icon
              name="i-mdi-loading"
              size="16"
              class="animate-spin"
            />
            <span>{{ message }}</span>
          </div>
          <USkeleton class="h-10 w-full rounded-lg" />
          <USkeleton class="h-10 w-3/4 rounded-lg" />
        </div>

        <div
          v-else-if="status === 'success'"
          class="space-y-4 text-center"
        >
          <div class="auth-success-illustration">
            <Icon
              name="i-mdi-check"
              size="44"
            />
          </div>
          <p class="text-sm text-muted">
            {{ message }}
          </p>
          <UButton
            to="/"
            block
            size="lg"
          >
            返回首页
          </UButton>
        </div>

        <div
          v-else
          class="space-y-4"
        >
          <div class="auth-message auth-message--error">
            <Icon
              name="i-mdi-alert-circle-outline"
              size="16"
              class="auth-message__icon"
            />
            <span>{{ message }}</span>
          </div>
          <UButton
            to="/register"
            block
            size="lg"
            icon="i-mdi-account-plus-outline"
          >
            重新注册
          </UButton>
          <UButton
            to="/login"
            variant="outline"
            color="neutral"
            block
            size="lg"
            icon="i-mdi-login"
          >
            去登录
          </UButton>
        </div>
      </UCard>

      <div class="auth-footer-links">
        <UButton
          variant="link"
          size="sm"
          to="/login"
          class="px-0"
        >
          去登录
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
