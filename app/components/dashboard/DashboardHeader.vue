<script lang="ts" setup>
import { useAuth } from '~/composables/useAuth'

const props = defineProps<{
  menuItems: {
    key: string
    title: string
    icon: string
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
  <header class="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
    <Sheet>
      <SheetTrigger as-child>
        <Button variant="outline" size="icon" class="shrink-0 md:hidden">
          <Icon name="mdi:menu" class="size-5" />
          <span class="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" class="flex flex-col">
        <nav class="grid gap-2 text-lg font-medium">
          <NuxtLink to="/" class="flex items-center gap-2 text-lg font-semibold mb-6">
            <Icon name="mdi:api" class="size-6" />
            <span>OpenAPI Panel</span>
          </NuxtLink>
          <button
            v-for="item in menuItems"
            :key="item.key"
            @click="emit('update:modelValue', item.key)"
            :class="[
              'mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:text-foreground',
              modelValue === item.key ? 'bg-muted text-foreground' : 'text-muted-foreground'
            ]"
          >
            <Icon :name="item.icon" class="size-5" />
            {{ item.title }}
          </button>
        </nav>
        <div class="mt-auto">
          <Button variant="outline" class="w-full justify-start gap-2 mb-2" as-child>
            <NuxtLink to="/">
              <Icon name="mdi:home-outline" class="size-5" />
              返回前台首页
            </NuxtLink>
          </Button>
          <Button variant="outline" class="w-full justify-start gap-2 mb-2" as-child v-if="$route.path.startsWith('/admin')">
            <NuxtLink to="/user">
              <Icon name="mdi:account-outline" class="size-5" />
              用户后台
            </NuxtLink>
          </Button>
          <Button variant="outline" class="w-full justify-start gap-2 mb-2" as-child v-if="$route.path.startsWith('/user') && user?.role === 'admin'">
            <NuxtLink to="/admin">
              <Icon name="mdi:shield-account-outline" class="size-5" />
              管理员后台
            </NuxtLink>
          </Button>
          <Button variant="outline" class="w-full justify-start gap-2" @click="handleLogout">
            <Icon name="mdi:logout" class="size-5" />
            退出登录
          </Button>
        </div>
      </SheetContent>
    </Sheet>
    
    <div class="w-full flex-1">
      <div class="flex items-center gap-2 md:hidden text-lg font-semibold">
        <span class="truncate">OpenAPI</span>
      </div>
    </div>
    
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="secondary" size="icon" class="rounded-full">
          <Avatar class="size-8">
            <AvatarImage :src="user?.avatarUrl || ''" />
            <AvatarFallback>{{ user?.username?.charAt(0).toUpperCase() || 'U' }}</AvatarFallback>
          </Avatar>
          <span class="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>我的账号</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="handleLogout">退出登录</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </header>
</template>
