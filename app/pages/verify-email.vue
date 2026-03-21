<script lang="ts" setup>
const route = useRoute()
const token = computed(() => (route.query.token || '').toString())
const user = computed(() => (route.query.user || '').toString())

const status = ref<'pending' | 'success' | 'error'>('pending')
const message = ref('正在验证，请稍候...')
const verifying = ref(false)

onMounted(async () => {
  if (verifying.value) {
    return
  }
  verifying.value = true

  if (!token.value || !user.value) {
    status.value = 'error'
    message.value = '验证链接无效'
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
  catch (error: any) {
    status.value = 'error'
    message.value = error?.message || '验证失败'
  }
  finally {
    verifying.value = false
  }
})
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div class="auth-card">
        <h1 class="auth-title">
          邮箱验证
        </h1>
        <p class="auth-subtitle">
          {{ message }}
        </p>

        <div
          v-if="status === 'success'"
          class="auth-actions"
        >
          <NuxtLink
            class="auth-button"
            to="/"
          >返回首页</NuxtLink>
        </div>
        <div
          v-else-if="status === 'error'"
          class="auth-actions"
        >
          <NuxtLink
            class="auth-button"
            to="/register"
          >重新注册</NuxtLink>
          <NuxtLink
            class="auth-button auth-ghost"
            to="/login"
          >去登录</NuxtLink>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>Verify Access</h3>
        <p>邮箱验证后才会创建有效用户会话。</p>
        <div class="auth-chip">
          Email Verification · Session Auth
        </div>
      </div>
    </div>
  </div>
</template>
