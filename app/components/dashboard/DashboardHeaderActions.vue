<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useDashboardConfig } from '~/composables/dashboard/useDashboardConfig'

const props = defineProps<{
  onRefresh?: () => void | Promise<void>
  refreshing?: boolean
}>()

const config = useDashboardConfig()
const { user, logout } = useAuth()
const router = useRouter()

const displayName = computed(() => user.value?.displayName || user.value?.username || (config.value.id === 'admin' ? 'Admin' : 'User'))

const userMenuItems = computed<DropdownMenuItem[][]>(() => {
  const extra = config.value.userMenuExtra?.({ logout }) || []
  return [
    [{ type: 'label', label: user.value?.email || displayName.value }],
    ...extra,
    [{
      label: '退出登录',
      icon: 'i-mdi-logout',
      color: 'error',
      async onSelect() {
        await logout()
        await router.push(config.value.loginRedirect)
      }
    }]
  ]
})

async function handleRefresh() {
  if (!props.onRefresh) return
  await props.onRefresh()
}
</script>

<template>
  <div class="flex items-center gap-1">
    <UButton
      v-if="onRefresh"
      variant="ghost"
      color="neutral"
      icon="i-mdi-refresh"
      :loading="refreshing"
      aria-label="刷新"
      @click="handleRefresh"
    />

    <ClientOnly>
      <UColorModeButton />
      <template #fallback>
        <UButton
          color="neutral"
          variant="ghost"
          square
          disabled
          icon="i-mdi-theme-light-dark"
          aria-hidden="true"
        />
      </template>
    </ClientOnly>

    <!-- 角色专属头部操作（如 user 的站内信铃铛）由具体后台的 HeaderActions 注入 -->
    <slot />

    <UDropdownMenu
      :items="userMenuItems"
      :content="{ align: 'end', collisionPadding: 12 }"
      :ui="{ content: 'w-56' }"
    >
      <UButton
        variant="ghost"
        color="neutral"
        class="gap-2 pr-2"
      >
        <UAvatar
          :src="user?.avatarUrl || undefined"
          :alt="displayName"
          size="2xs"
        />
        <span class="hidden text-sm font-medium sm:inline">
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
