<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useDashboardConfig } from '~/composables/dashboard/use-dashboard-config'

const props = defineProps<{
  onRefresh?: () => void | Promise<void>
  refreshing?: boolean
}>()

const config = useDashboardConfig()
const { user, loading, logout } = useAuth()
const router = useRouter()
const { t } = useI18n()

const fallbackName = computed(() => config.value.id === 'admin'
  ? t('common.identities.admin')
  : t('common.identities.user'))
const displayName = computed(() => user.value?.displayName || user.value?.username || '')
const userButtonLabel = computed(() => displayName.value || fallbackName.value)
const avatarSrc = computed(() => user.value?.avatarUrl || undefined)
const isUserPending = computed(() => loading.value || !user.value)

const userMenuItems = computed<DropdownMenuItem[][]>(() => {
  const extra = config.value.userMenuExtra?.({ logout }) || []
  return [
    [{ type: 'label', label: user.value?.email || userButtonLabel.value }],
    ...extra,
    [{
      label: t('common.actions.logout'),
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
      icon="i-lucide-refresh-cw"
      :loading="refreshing"
      :aria-label="t('common.actions.refresh')"
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

    <CommonNotificationBell />

    <UButton
      v-if="isUserPending"
      variant="ghost"
      color="neutral"
      class="gap-2 pr-2"
      disabled
    >
      <UAvatar
        :alt="fallbackName"
        size="2xs"
      />
      <span class="hidden h-4 w-16 rounded-sm bg-elevated sm:inline-block" />
      <UIcon
        name="i-mdi-chevron-down"
        class="size-4 text-muted"
      />
    </UButton>
    <UDropdownMenu
      v-else
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
          :src="avatarSrc"
          :alt="userButtonLabel"
          size="2xs"
        />
        <span class="hidden text-sm font-medium sm:inline">
          {{ userButtonLabel }}
        </span>
        <UIcon
          name="i-mdi-chevron-down"
          class="size-4 text-muted"
        />
      </UButton>
    </UDropdownMenu>
  </div>
</template>
