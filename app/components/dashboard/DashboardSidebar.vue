<script lang="ts" setup>
import { useAuth } from '~/composables/useAuth'

const props = defineProps<{
  menuItems: {
    key: string
    title: string
    icon: string
    description?: string
  }[]
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])

const { user, logout } = useAuth()

const handleLogout = async () => {
  await logout()
  navigateTo('/login')
}
</script>

<template>
  <aside class="hidden md:flex w-64 flex-col border-r bg-muted/40">
    <div class="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
        <Icon name="mdi:api" class="size-6" />
        <span class="">OpenAPI Panel</span>
      </NuxtLink>
    </div>
    <div class="flex-1 overflow-auto">
      <nav class="grid items-start px-2 text-sm font-medium lg:px-4 mt-4">
        <button
          v-for="item in menuItems"
          :key="item.key"
          @click="emit('update:modelValue', item.key)"
          :class="[
            'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary mb-1',
            modelValue === item.key ? 'bg-muted text-primary' : 'text-muted-foreground'
          ]"
        >
          <Icon :name="item.icon" class="size-4" />
          {{ item.title }}
        </button>
      </nav>
    </div>
    <div class="mt-auto p-4 border-t">
      <div class="flex items-center gap-3 mb-4">
        <Avatar>
          <AvatarImage :src="user?.avatarUrl || ''" />
          <AvatarFallback>{{ user?.username?.charAt(0).toUpperCase() || 'U' }}</AvatarFallback>
        </Avatar>
        <div class="flex flex-col text-sm overflow-hidden">
          <span class="truncate font-medium">{{ user?.username }}</span>
          <span class="truncate text-xs text-muted-foreground">{{ user?.email }}</span>
        </div>
      </div>
      <Button variant="outline" class="w-full justify-start gap-2 mb-2" as-child>
        <NuxtLink to="/">
          <Icon name="mdi:home-outline" class="size-4" />
          返回前台首页
        </NuxtLink>
      </Button>
      <Button variant="outline" class="w-full justify-start gap-2 mb-2" as-child v-if="$route.path.startsWith('/admin')">
        <NuxtLink to="/user">
          <Icon name="mdi:account-outline" class="size-4" />
          用户后台
        </NuxtLink>
      </Button>
      <Button variant="outline" class="w-full justify-start gap-2 mb-2" as-child v-if="$route.path.startsWith('/user') && user?.role === 'admin'">
        <NuxtLink to="/admin">
          <Icon name="mdi:shield-account-outline" class="size-4" />
          管理员后台
        </NuxtLink>
      </Button>
      <Button variant="outline" class="w-full justify-start gap-2" @click="handleLogout">
        <Icon name="mdi:logout" class="size-4" />
        退出登录
      </Button>
    </div>
  </aside>
</template>
