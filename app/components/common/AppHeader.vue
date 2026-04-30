<script lang="ts" setup>
const { user, fetchMe, logout } = useAuth()
const { settings } = useSiteSettings()

onMounted(() => {
  if (!user.value) {
    fetchMe()
  }
})

const handleLogout = async () => {
  await logout()
  await navigateTo('/')
}
</script>

<template>
  <ClientOnly>
    <header class="max-w-275 mx-auto px-5 py-6 flex items-end justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 shrink-0 overflow-hidden rounded-full border border-default bg-default">
          <img
            :src="settings.siteImg"
            alt="Avatar"
            class="w-full h-full object-cover block"
          >
        </div>
        <div class="flex flex-col justify-center">
          <h1 class="m-0 text-2xl tracking-wide font-normal">
            {{ settings.siteName }}
          </h1>
          <p class="m-0 mt-1 text-xs text-muted">
            {{ settings.siteDescription }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          to="/friend-links"
        >
          友情链接
        </UButton>

        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          to="/stats"
        >
          调用统计
        </UButton>

        <template v-if="user">
          <CommonUserNotificationBell v-if="user.kind === 'user'" />
          <div class="text-sm text-muted">
            {{ user.username }}
          </div>
          <UButton
            v-if="user.kind === 'admin'"
            variant="ghost"
            color="neutral"
            size="sm"
            to="/admin"
          >
            管理后台
          </UButton>
          <UButton
            v-if="user.kind === 'user'"
            variant="ghost"
            color="neutral"
            size="sm"
            to="/user/apikeys"
          >
            用户后台
          </UButton>
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            @click="handleLogout"
          >
            退出
          </UButton>
        </template>
        <template v-else>
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            to="/admin/login"
          >
            管理登录
          </UButton>
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            to="/login"
          >
            登录
          </UButton>
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            to="/register"
          >
            注册
          </UButton>
        </template>
      </div>
    </header>
  </ClientOnly>
</template>
