<script lang="ts" setup>
definePageMeta({ middleware: 'auth-admin' })

interface PolicyForm {
  minPasswordLength: number
  maxPasswordLength: number
  minUsernameLength: number
  maxUsernameLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireDigit: boolean
  requireSpecial: boolean
  specialChars: string
}

const form = reactive<PolicyForm>({
  minPasswordLength: 8,
  maxPasswordLength: 64,
  minUsernameLength: 3,
  maxUsernameLength: 20,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: false,
  specialChars: '!@#$%^&*()-_=+[]{}|;:,.<>/?',
})

const statusMessage = ref('')
const saving = ref(false)

const { data, error } = await useFetch('/api/admin/auth-policy')
if (data.value?.code === 0) {
  Object.assign(form, data.value.data)
}
if (error.value) {
  statusMessage.value = '加载策略失败'
}

const savePolicy = async () => {
  saving.value = true
  statusMessage.value = ''
  try {
    const res = await $fetch<{ code: number; msg: string; data: PolicyForm }>(
      '/api/admin/auth-policy',
      { method: 'PUT', body: form },
    )
    if (res.code === 0) {
      statusMessage.value = '策略已更新'
    }
    else {
      statusMessage.value = res.msg
    }
  }
  catch (error: any) {
    statusMessage.value = error?.message || '保存失败'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div class="auth-card">
        <h1 class="auth-title">账号安全策略</h1>
        <p class="auth-subtitle">调整用户名与密码规则，并即时生效。</p>

        <div class="auth-grid">
          <div>
            <div class="auth-label">用户名长度</div>
            <div class="grid grid-cols-2 gap-2">
              <input v-model.number="form.minUsernameLength" type="number" class="auth-input" min="2">
              <input v-model.number="form.maxUsernameLength" type="number" class="auth-input" min="2">
            </div>
          </div>
          <div>
            <div class="auth-label">密码长度</div>
            <div class="grid grid-cols-2 gap-2">
              <input v-model.number="form.minPasswordLength" type="number" class="auth-input" min="6">
              <input v-model.number="form.maxPasswordLength" type="number" class="auth-input" min="6">
            </div>
          </div>
          <div class="grid gap-2">
            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.requireUppercase" type="checkbox">
              需要大写字母
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.requireLowercase" type="checkbox">
              需要小写字母
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.requireDigit" type="checkbox">
              需要数字
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.requireSpecial" type="checkbox">
              需要特殊字符
            </label>
          </div>
          <div>
            <div class="auth-label">允许的特殊字符</div>
            <input v-model="form.specialChars" type="text" class="auth-input" :disabled="!form.requireSpecial">
          </div>

          <div v-if="statusMessage" class="text-sm text-muted">{{ statusMessage }}</div>

          <div class="auth-actions">
            <button class="auth-button" type="button" :disabled="saving" @click="savePolicy">
              {{ saving ? '保存中...' : '保存策略' }}
            </button>
            <NuxtLink class="auth-button auth-ghost" to="/">返回首页</NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>策略即安全</h3>
        <p>更严格的策略将提升账号防护等级。</p>
        <div class="auth-chip">Admin Only · Instant Apply</div>
      </div>
    </div>
  </div>
</template>
