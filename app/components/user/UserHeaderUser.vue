<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { user, logout } = useAuth()
const router = useRouter()
const toast = useToast()

const displayName = computed(() => user.value?.username || 'User')

const items = computed<DropdownMenuItem[][]>(() => [[
  {
    type: 'label',
    label: user.value?.email || displayName.value,
  },
], [
  {
    label: '账户设置',
    icon: 'i-mdi-account-cog-outline',
    onSelect() {
      toast.add({ title: '账户设置', description: '账户设置页尚未开放', color: 'neutral' })
    },
  },
  {
    label: '返回前台',
    icon: 'i-mdi-arrow-left',
    to: '/',
  },
], [
  {
    label: '退出登录',
    icon: 'i-mdi-logout',
    color: 'error',
    async onSelect() {
      await logout()
      await router.push('/login')
    },
  },
]])

const initial = computed(() => displayName.value.slice(0, 1).toUpperCase())
</script>

<template>
  <div class="flex items-center gap-1">
    <CommonUserNotificationBell />
    <UDropdownMenu
      :items="items"
      :content="{ align: 'end', collisionPadding: 12 }"
      :ui="{ content: 'w-56' }"
    >
      <UButton
        variant="ghost"
        color="neutral"
        class="gap-2 pr-2"
      >
        <span class="inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-inverted text-xs font-semibold">
          <img
            v-if="user?.avatarUrl"
            :src="user.avatarUrl"
            :alt="displayName"
            class="w-full h-full object-cover block"
          >
          <template v-else>
            {{ initial }}
          </template>
        </span>
        <span class="hidden sm:inline text-sm font-medium">
          {{ displayName }}
        </span>
        <UIcon
          name="i-mdi-chevron-down"
          class="size-4 text-muted"
        />
      </UButton>
    </UDropdownMenu>
  </div>
</template>
