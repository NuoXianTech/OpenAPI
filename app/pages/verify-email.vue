<script lang="ts" setup>
const route = useRoute()
const token = computed(() => (route.query.token || '').toString())
const user = computed(() => (route.query.user || '').toString())

const status = ref<'pending' | 'success' | 'error'>('pending')
const message = ref('正在验证，请稍候...')
const verifying = ref(false)

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

const headerIcon = computed(() => {
  if (status.value === 'success') {
    return 'mdi:email-check-outline'
  }
  if (status.value === 'error') {
    return 'mdi:email-alert-outline'
  }
  return 'mdi:email-sync-outline'
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
    const res = await $fetch<{ code: number, msg: string, data: unknown }>('/api/auth/verify-email', {
      query: { token: token.value, user: user.value },
    })
    if (res.code === 0) {
      status.value = 'success'
      message.value = '验证成功，已自动登录，正在跳转首页...'
      await new Promise(resolve => setTimeout(resolve, 800))
      await navigateTo('/')
    }
    else {
      status.value = 'error'
      message.value = res.msg || '验证失败'
    }
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
  <div class="min-h-screen bg-default flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center size-12 rounded-xl bg-elevated border border-default mb-3">
          <Icon
            :name="headerIcon"
            size="24"
          />
        </div>
        <h1 class="text-xl font-semibold">
          {{ headerTitle }}
        </h1>
        <p class="text-sm text-muted mt-1">
          {{ headerSubtitle }}
        </p>
      </div>

      <UCard class="shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
        <div class="space-y-4 p-1">
          <div
            v-if="status === 'pending'"
            class="space-y-3"
          >
            <div class="flex items-center gap-2 text-sm text-muted">
              <Icon
                name="mdi:loading"
                size="16"
                class="animate-spin"
              />
              <span>{{ message }}</span>
            </div>
            <USkeleton class="h-10 w-full rounded-md" />
            <USkeleton class="h-10 w-3/4 rounded-md" />
          </div>

          <div
            v-else-if="status === 'success'"
            class="space-y-3"
          >
            <div class="text-sm text-[var(--green)] bg-[var(--green)]/5 rounded-lg px-3 py-2">
              {{ message }}
            </div>
            <UButton
              to="/"
              block
            >
              返回首页
            </UButton>
          </div>

          <div
            v-else
            class="space-y-3"
          >
            <div class="text-sm text-[var(--red)] bg-[var(--red)]/5 rounded-lg px-3 py-2">
              {{ message }}
            </div>
            <UButton
              to="/register"
              block
            >
              重新注册
            </UButton>
            <UButton
              to="/login"
              variant="outline"
              block
            >
              去登录
            </UButton>
          </div>
        </div>
      </UCard>

      <div class="flex items-center justify-center gap-2 mt-4">
        <UButton
          variant="link"
          size="sm"
          to="/login"
          class="text-muted"
        >
          去登录
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
