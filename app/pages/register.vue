<script lang="ts" setup>
const { register } = useAuth()
const form = reactive({
  username: '',
  email: '',
  password: '',
  confirm: '',
})
const errorMessage = ref('')
const successMessage = ref('')
const submitting = ref(false)

const submit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (form.password !== form.confirm) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  submitting.value = true
  try {
    const res = await register({
      username: form.username,
      email: form.email,
      password: form.password,
    })
    if (res.verificationRequired) {
      successMessage.value = '验证邮件已发送，请前往邮箱完成验证。'
    }
    form.password = ''
    form.confirm = ''
  }
  catch (error: any) {
    errorMessage.value = error?.message || '注册失败'
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
        <h1 class="auth-title">创建账号</h1>
        <p class="auth-subtitle">注册后将发送验证邮件，完成验证即可登录。</p>

        <form class="auth-grid" @submit.prevent="submit">
          <div>
            <div class="auth-label">用户名</div>
            <input
              v-model="form.username"
              type="text"
              class="auth-input"
              autocomplete="username"
              placeholder="openapi_user"
            >
          </div>
          <div>
            <div class="auth-label">邮箱</div>
            <input
              v-model="form.email"
              type="email"
              class="auth-input"
              autocomplete="email"
              placeholder="you@example.com"
            >
          </div>
          <div>
            <div class="auth-label">密码</div>
            <input
              v-model="form.password"
              type="password"
              class="auth-input"
              autocomplete="new-password"
              placeholder="设置登录密码"
            >
          </div>
          <div>
            <div class="auth-label">确认密码</div>
            <input
              v-model="form.confirm"
              type="password"
              class="auth-input"
              autocomplete="new-password"
              placeholder="再次输入密码"
            >
          </div>

          <div v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</div>
          <div v-if="successMessage" class="text-green-600 text-sm">{{ successMessage }}</div>

          <div class="auth-actions">
            <button class="auth-button" type="submit" :disabled="submitting">
              {{ submitting ? '提交中...' : '注册' }}
            </button>
            <NuxtLink class="auth-button auth-ghost" to="/login">已有账号</NuxtLink>
          </div>
        </form>

        <p class="auth-note">
          注册即表示你同意平台服务条款与安全规范。
        </p>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>安全策略可配置</h3>
        <p>管理员可在后台调整密码与用户名策略，确保账号安全。</p>
        <div class="auth-chip">Policy Driven · Email Verified</div>
      </div>
    </div>
  </div>
</template>
