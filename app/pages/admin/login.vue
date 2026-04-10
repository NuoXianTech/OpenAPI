<script lang="ts" setup>
import { toast } from 'vue-sonner'

const { adminLogin, fetchMe, user } = useAuth()

const form = reactive({
  username: String(useRuntimeConfig().public.adminUsernameHint || 'admin'),
  password: '',
})
const submitting = ref(false)
const errorMessage = ref('')
const checkingAuth = ref(true)

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

onMounted(async () => {
  await fetchMe()
  if (user.value?.kind === 'admin') {
    await navigateTo('/admin')
    return
  }
  checkingAuth.value = false
})

const submit = async () => {
  submitting.value = true
  errorMessage.value = ''
  try {
    await adminLogin({ username: form.username, password: form.password })
    toast.success('管理员登录成功')
    await navigateTo('/admin')
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '管理员登录失败')
    toast.error(errorMessage.value)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div
        class="auth-card"
        style="width:min(560px, 94vw);"
      >
        <div
          v-if="checkingAuth"
          class="grid gap-4"
        >
          <div class="flex items-center gap-2">
            <Badge variant="outline">
              Admin
            </Badge>
            <Badge variant="secondary">
              Checking
            </Badge>
          </div>
          <h1 class="auth-title">
            检查管理员登录状态
          </h1>
          <p class="auth-subtitle">
            正在确认是否已登录管理员，请稍候...
          </p>
          <div class="grid gap-2">
            <Skeleton class="h-10 w-full rounded-md" />
            <Skeleton class="h-10 w-full rounded-md" />
            <Skeleton class="h-10 w-1/2 rounded-md" />
          </div>
        </div>

        <div
          v-else
          class="grid gap-4"
        >
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 class="auth-title">
                管理员登录
              </h1>
              <p class="auth-subtitle">
                使用 .env 中配置的管理员账号密码进入管理后台。
              </p>
            </div>
            <Badge variant="outline">
              Admin Only
            </Badge>
          </div>

          <Card class="border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">
                管理后台认证
              </CardTitle>
              <CardDescription>
                仅管理员账号可访问控制台。
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                class="grid gap-4"
                @submit.prevent="submit"
              >
                <div class="grid gap-2">
                  <Label for="admin-username">
                    管理员用户名
                  </Label>
                  <Input
                    id="admin-username"
                    v-model="form.username"
                    type="text"
                    autocomplete="username"
                    placeholder="admin"
                  />
                </div>

                <div class="grid gap-2">
                  <Label for="admin-password">
                    管理员密码
                  </Label>
                  <Input
                    id="admin-password"
                    v-model="form.password"
                    type="password"
                    autocomplete="current-password"
                    placeholder="输入管理员密码"
                  />
                </div>

                <div v-if="errorMessage">
                  <Badge
                    variant="destructive"
                    class="max-w-full whitespace-normal break-words"
                  >
                    {{ errorMessage }}
                  </Badge>
                </div>

                <div class="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    :disabled="submitting"
                  >
                    {{ submitting ? '登录中...' : '登录管理后台' }}
                  </Button>
                  <Button
                    as-child
                    variant="outline"
                  >
                    <NuxtLink to="/">
                      返回首页
                    </NuxtLink>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>Admin Console</h3>
        <p>系统策略、风险控制、全局配置统一管理。</p>
        <div class="auth-chip">
          ENV Credential · Session Auth
        </div>
      </div>
    </div>
  </div>
</template>
