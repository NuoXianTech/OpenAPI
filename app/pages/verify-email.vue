<script lang="ts" setup>
import { toast } from 'vue-sonner'

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

const statusLabel = computed(() => {
  if (status.value === 'success') {
    return '验证成功'
  }
  if (status.value === 'error') {
    return '验证失败'
  }
  return '验证中'
})

onMounted(async () => {
  if (verifying.value) {
    return
  }
  verifying.value = true

  if (!token.value || !user.value) {
    status.value = 'error'
    message.value = '验证链接无效'
    toast.error(message.value)
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
      toast.success('邮箱验证成功')
      await new Promise(resolve => setTimeout(resolve, 800))
      await navigateTo('/')
    }
    else {
      status.value = 'error'
      message.value = res.msg || '验证失败'
      toast.error(message.value)
    }
  }
  catch (error: unknown) {
    status.value = 'error'
    message.value = getErrorMessage(error, '验证失败')
    toast.error(message.value)
  }
  finally {
    verifying.value = false
  }
})
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div
        class="auth-card"
        style="width:min(560px, 94vw);"
      >
        <div class="grid gap-4">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 class="auth-title">
                邮箱验证
              </h1>
              <p class="auth-subtitle">
                验证通过后会自动创建有效会话并跳转。
              </p>
            </div>
            <Badge
              :variant="status === 'success' ? 'secondary' : status === 'error' ? 'destructive' : 'outline'"
            >
              {{ statusLabel }}
            </Badge>
          </div>

          <Card class="border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">
                邮箱验证状态
              </CardTitle>
              <CardDescription>
                {{ message }}
              </CardDescription>
            </CardHeader>

            <CardContent class="grid gap-4">
              <div
                v-if="status === 'pending'"
                class="grid gap-2"
              >
                <Skeleton class="h-10 w-full rounded-md" />
                <Skeleton class="h-10 w-3/4 rounded-md" />
              </div>

              <div
                v-else-if="status === 'success'"
                class="grid gap-3"
              >
                <Badge variant="secondary">
                  验证已通过，正在跳转首页
                </Badge>
                <Button as-child>
                  <NuxtLink to="/">
                    返回首页
                  </NuxtLink>
                </Button>
              </div>

              <div
                v-else
                class="grid gap-3"
              >
                <Badge variant="destructive">
                  验证失败，请重新获取验证邮件。
                </Badge>
                <div class="flex flex-wrap gap-2">
                  <Button as-child>
                    <NuxtLink to="/register">
                      重新注册
                    </NuxtLink>
                  </Button>
                  <Button
                    as-child
                    variant="outline"
                  >
                    <NuxtLink to="/login">
                      去登录
                    </NuxtLink>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
