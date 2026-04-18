<script setup lang="ts">
definePageMeta({ layout: false })

const { adminLogin } = useAuth()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  if (!form.username.trim() || !form.password) {
    errorMsg.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    await adminLogin({ username: form.username.trim(), password: form.password })
    await navigateTo('/admin')
  }
  catch (err: any) {
    errorMsg.value = err?.data?.message || err?.message || '登录失败'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-default flex items-center justify-center p-4">
      <div class="w-full max-w-sm">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center size-12 rounded-xl bg-elevated border border-default mb-3">
            <Icon
              name="mdi:shield-crown-outline"
              size="24"
            />
          </div>
          <h1 class="text-xl font-semibold">
            管理员登录
          </h1>
          <p class="text-sm text-muted mt-1">
            请输入管理员凭据以继续
          </p>
        </div>

        <UCard class="shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
          <form
            class="space-y-4 p-1"
            @submit.prevent="handleLogin"
          >
            <UFormField label="用户名">
              <UInput
                v-model="form.username"
                placeholder="admin"
                icon="i-mdi-account-outline"
                autofocus
              />
            </UFormField>

            <UFormField label="密码">
              <UInput
                v-model="form.password"
                type="password"
                placeholder="••••••••"
                icon="i-mdi-lock-outline"
              />
            </UFormField>

            <div
              v-if="errorMsg"
              class="text-sm text-[var(--red)] bg-[var(--red)]/5 rounded-lg px-3 py-2"
            >
              {{ errorMsg }}
            </div>

            <UButton
              type="submit"
              block
              :loading="loading"
            >
              登录
            </UButton>
          </form>
        </UCard>

        <div class="text-center mt-4">
          <UButton
            variant="link"
            size="sm"
            to="/"
            class="text-muted"
          >
            返回前台
          </UButton>
        </div>
      </div>
    </div>
  </UApp>
</template>
