<script lang="ts" setup>
import { parseFetchError } from '#shared/utils/clientError'

useHead({ title: '邮箱验证' })

definePageMeta({ layout: false })

const route = useRoute()
const token = computed(() => (route.query.token || '').toString())
const user = computed(() => (route.query.user || '').toString())
const { fetchMe } = useAuth()

const status = ref<'pending' | 'success' | 'error'>('pending')
const message = ref('正在验证，请稍候...')
const verifying = ref(false)
const alreadyVerified = ref(false)

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
    return alreadyVerified.value ? '邮箱已验证，请前往登录' : '已自动登录，正在跳转用户中心'
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
    const result = await $fetch<{ alreadyVerified?: boolean }>('/api/auth/verify-email', {
      query: { token: token.value, user: user.value }
    })
    status.value = 'success'
    if (result?.alreadyVerified) {
      alreadyVerified.value = true
      message.value = '邮箱已验证，请前往登录'
      await new Promise(resolve => setTimeout(resolve, 3000))
      await navigateTo('/login')
    } else {
      message.value = '验证成功，已自动登录，正在跳转到用户中心...'
      await fetchMe(true)
      await new Promise(resolve => setTimeout(resolve, 3000))
      await navigateTo('/user')
    }
  } catch (error: unknown) {
    status.value = 'error'
    message.value = parseFetchError(error, '验证失败')
  } finally {
    verifying.value = false
  }
})
</script>

<template>
  <CommonAppAuthShell>
    <div class="auth-brand">
      <div class="auth-brand__logo">
        <UIcon
          :name="headerIcon"
          class="size-6"
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
          <UIcon
            name="i-mdi-loading"
            class="size-4 animate-spin"
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
          <UIcon
            name="i-mdi-check"
            class="size-11"
          />
        </div>
        <p class="text-sm text-muted">
          {{ message }}
        </p>
        <UButton
          :to="alreadyVerified ? '/login' : '/user'"
          block
          size="lg"
        >
          {{ alreadyVerified ? '去登录' : '进入用户中心' }}
        </UButton>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <div class="auth-message auth-message--error">
          <UIcon
            name="i-mdi-alert-circle-outline"
            class="auth-message__icon size-4"
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
</template>
