<script lang="ts" setup>
const route = useRoute()
const token = computed(() => (route.query.token || '').toString())
const user = computed(() => (route.query.user || '').toString())

const status = ref<'pending' | 'success' | 'error'>('pending')
const message = ref('正在验证，请稍候...')

watchEffect(async () => {
  if (!token.value || !user.value) {
    status.value = 'error'
    message.value = '验证链接无效'
    return
  }

  status.value = 'pending'
  message.value = '正在验证，请稍候...'

  try {
    const res = await $fetch<{ code: number; msg: string }>(
      '/api/auth/verify-email',
      { query: { token: token.value, user: user.value } },
    )
    if (res.code === 0) {
      status.value = 'success'
      message.value = '验证成功，已为你自动登录。'
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
})
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div class="auth-card">
        <h1 class="auth-title">邮箱验证</h1>
        <p class="auth-subtitle">{{ message }}</p>

        <div class="auth-actions" v-if="status === 'success'">
          <NuxtLink class="auth-button" to="/">返回首页</NuxtLink>
          <NuxtLink class="auth-button auth-ghost" to="/login">进入控制台</NuxtLink>
        </div>
        <div class="auth-actions" v-else-if="status === 'error'">
          <NuxtLink class="auth-button" to="/register">重新注册</NuxtLink>
          <NuxtLink class="auth-button auth-ghost" to="/login">去登录</NuxtLink>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>验证后即可访问</h3>
        <p>解锁 API Key、监控与统计分析等高级功能。</p>
        <div class="auth-chip">Verified Access · Secure</div>
      </div>
    </div>
  </div>
</template>
