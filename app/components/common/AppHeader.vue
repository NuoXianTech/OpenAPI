<script lang="ts" setup>
const { user, fetchMe, logout } = useAuth()

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
        <div class="w-12 h-12 shrink-0 overflow-hidden rounded-full border border-border bg-bg">
          <img
            :src="useRuntimeConfig().public.apiImg"
            alt="Avatar"
            class="w-full h-full object-cover block"
          >
        </div>
        <div class="flex flex-col justify-center">
          <h1 class="m-0 text-2xl tracking-wide font-normal">
            {{ useRuntimeConfig().public.apiName }}
          </h1>
          <p class="m-0 mt-1 text-xs text-[#666872]">
            {{ useRuntimeConfig().public.apiDescription }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <template v-if="user">
          <div class="text-sm text-muted">{{ user.username }}</div>
          <NuxtLink v-if="user.role === 'admin'" class="btn" to="/admin/auth-policy">管理后台</NuxtLink>
          <NuxtLink v-if="user.role === 'user'" class="btn" to="/user/apikeys">用户后台</NuxtLink>
          <button class="btn" @click="handleLogout">退出</button>
        </template>
        <template v-else>
          <NuxtLink class="btn" to="/admin/login">管理登录</NuxtLink>
          <NuxtLink class="btn" to="/login">登录</NuxtLink>
          <NuxtLink class="btn" to="/register">注册</NuxtLink>
        </template>
      </div>
    </header>
  </ClientOnly>
</template>
