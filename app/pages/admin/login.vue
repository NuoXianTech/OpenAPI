<script lang="ts" setup>
const { adminLogin } = useAuth()

const form = reactive({
  username: String(useRuntimeConfig().public.adminUsernameHint || 'admin'),
  password: '',
})
const submitting = ref(false)
const errorMessage = ref('')

const submit = async () => {
  submitting.value = true
  errorMessage.value = ''
  try {
    await adminLogin({ username: form.username, password: form.password })
    await navigateTo('/admin/auth-policy')
  }
  catch (error: any) {
    errorMessage.value = error?.message || '管理员登录失败'
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
        <h1 class="auth-title">管理员登录</h1>
        <p class="auth-subtitle">使用 .env 中配置的管理员账号密码进入管理后台。</p>

        <form class="auth-grid" @submit.prevent="submit">
          <div>
            <div class="auth-label">管理员用户名</div>
            <input v-model="form.username" class="auth-input" type="text" autocomplete="username">
          </div>

          <div>
            <div class="auth-label">管理员密码</div>
            <input v-model="form.password" class="auth-input" type="password" autocomplete="current-password">
          </div>

          <div v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</div>

          <div class="auth-actions">
            <button class="auth-button" type="submit" :disabled="submitting">
              {{ submitting ? '登录中...' : '登录管理后台' }}
            </button>
            <NuxtLink class="auth-button auth-ghost" to="/">返回首页</NuxtLink>
          </div>
        </form>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>Admin Console</h3>
        <p>系统策略、风险控制、全局配置统一管理。</p>
        <div class="auth-chip">ENV Credential · Session Auth</div>
      </div>
    </div>
  </div>
</template>
