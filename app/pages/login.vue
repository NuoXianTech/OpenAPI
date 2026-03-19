<script lang="ts" setup>
const { login } = useAuth()
const form = reactive({
  identifier: '',
  password: '',
})
const errorMessage = ref('')
const submitting = ref(false)

const submit = async () => {
  errorMessage.value = ''
  submitting.value = true
  try {
    const payload = form.identifier.includes('@')
      ? { email: form.identifier, password: form.password }
      : { username: form.identifier, password: form.password }

    await login(payload)
    await navigateTo('/')
  }
  catch (error: any) {
    errorMessage.value = error?.message || '登录失败'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div class="auth-card">
        <h1 class="auth-title">欢迎回来</h1>
        <p class="auth-subtitle">使用邮箱或用户名登录，继续管理你的 API。</p>

        <form class="auth-grid" @submit.prevent="submit">
          <div>
            <div class="auth-label">邮箱或用户名</div>
            <input
              v-model="form.identifier"
              type="text"
              class="auth-input"
              autocomplete="username"
              placeholder="you@example.com"
            >
          </div>
          <div>
            <div class="auth-label">密码</div>
            <input
              v-model="form.password"
              type="password"
              class="auth-input"
              autocomplete="current-password"
              placeholder="输入你的密码"
            >
          </div>

          <div v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</div>

          <div class="auth-actions">
            <button class="auth-button" type="submit" :disabled="submitting">
              {{ submitting ? '登录中...' : '登录' }}
            </button>
            <NuxtLink class="auth-button auth-ghost" to="/register">创建账号</NuxtLink>
          </div>
        </form>

        <p class="auth-note">
          忘记密码？请联系管理员处理。
        </p>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>OpenAPI 控制台</h3>
        <p>实时掌握接口调用状态、性能与配额使用情况。</p>
        <div class="auth-chip">API Monitor · Rate Guard · Audit Log</div>
      </div>
    </div>
  </div>
</template>
