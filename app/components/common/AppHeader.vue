<script lang="ts" setup>
import { ADMIN_OVERVIEW_PATH } from '~/constants/admin-sections/overview'
import { USER_OVERVIEW_PATH } from '~/constants/user-sections/overview'

const { user, logout } = useAuth()
const { settings } = useSiteSettings()

const handleLogout = async () => {
  await logout()
  await navigateTo('/')
}
</script>

<template>
  <header class="max-w-275 mx-auto px-5 py-6 flex items-end justify-between gap-4">
    <NuxtLink
      to="/"
      class="flex items-center gap-3 group"
    >
      <UAvatar
        :src="settings.siteImg"
        :alt="settings.siteName"
        size="lg"
        class="shrink-0 ring-1 ring-default transition-transform group-hover:scale-105"
      />
      <div class="flex flex-col justify-center">
        <h1 class="m-0 text-2xl tracking-wide font-normal">
          {{ settings.siteName }}
        </h1>
        <p class="m-0 mt-1 text-xs text-muted">
          {{ settings.siteDescription }}
        </p>
      </div>
    </NuxtLink>

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

      <ClientOnly>
        <template v-if="user">
          <div class="text-sm text-muted">
            {{ user.username }}
          </div>
          <UButton
            v-if="user.kind === 'admin'"
            variant="ghost"
            color="neutral"
            size="sm"
            :to="ADMIN_OVERVIEW_PATH"
          >
            管理后台
          </UButton>
          <UButton
            v-if="user.kind === 'user'"
            variant="ghost"
            color="neutral"
            size="sm"
            :to="USER_OVERVIEW_PATH"
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
        <template #fallback>
          <USkeleton class="h-8 w-56 rounded-md" />
        </template>
      </ClientOnly>
    </div>
  </header>
</template>
