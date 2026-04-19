<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { user, logout } = useAuth()
const router = useRouter()
const toast = useToast()

const displayName = computed(() => user.value?.username || 'Admin')

const items = computed<DropdownMenuItem[][]>(() => [[
  {
    type: 'label',
    label: user.value?.email || displayName.value,
  },
], [
  {
    label: '个人信息',
    icon: 'i-mdi-account-outline',
    onSelect() {
      toast.add({ title: '个人信息', description: '个人信息页尚未开放', color: 'neutral' })
    },
  },
  {
    label: '站点设置',
    icon: 'i-mdi-cog-outline',
    to: '/admin/settings',
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
      await router.push('/admin/login')
    },
  },
]])

const initial = computed(() => displayName.value.slice(0, 1).toUpperCase())
</script>

<template>
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
</template>
