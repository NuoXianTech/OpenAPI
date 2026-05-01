<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'

const { user, logout } = useAuth()
const { settings } = useSiteSettings()
const router = useRouter()

const open = ref(false)

const mainLinks = Object.freeze([[
  {
    label: '概览',
    icon: 'i-mdi-view-dashboard-outline',
    to: '/user',
  },
  {
    label: '钱包',
    icon: 'i-mdi-wallet-outline',
    to: '/user/wallet',
  },
  {
    label: 'API Key',
    icon: 'i-mdi-key-outline',
    to: '/user/apikeys',
  },
  {
    label: '调用日志',
    icon: 'i-mdi-history',
    to: '/user/calls',
  },
  {
    label: '个人设置',
    icon: 'i-mdi-account-cog-outline',
    to: '/user/profile',
  },
]]) as unknown as NavigationMenuItem[][]

const footerLinks = Object.freeze([[
  {
    label: '返回前台',
    icon: 'i-mdi-arrow-left',
    to: '/',
  },
]]) as unknown as NavigationMenuItem[][]

const userMenuItems = computed<DropdownMenuItem[][]>(() => [[
  {
    type: 'label',
    label: user.value?.email || user.value?.username || 'User',
  },
], [
  {
    label: '个人设置',
    icon: 'i-mdi-account-cog-outline',
    to: '/user/profile',
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
    async onSelect() {
      await logout()
      await router.push('/login')
    },
  },
]])
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      id="user"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <UDropdownMenu
          :items="[[{ label: settings.siteName || 'OpenAPI', icon: 'i-mdi-account-circle-outline', disabled: true }]]"
          :content="{ align: 'start' }"
          :ui="{ content: 'w-48' }"
        >
          <UButton
            :label="collapsed ? undefined : (settings.siteName || 'OpenAPI')"
            icon="i-mdi-account-circle-outline"
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            class="data-[state=open]:bg-elevated"
            :ui="{ trailingIcon: 'size-5' }"
          />
        </UDropdownMenu>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="mainLinks[0]"
          orientation="vertical"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="footerLinks[0]"
          orientation="vertical"
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="userMenuItems"
          :content="{ align: 'start', collisionPadding: 12 }"
          :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
        >
          <UButton
            :label="collapsed ? undefined : (user?.username || 'User')"
            :trailing-icon="collapsed ? undefined : 'i-mdi-chevron-up'"
            icon="i-mdi-account-outline"
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            class="data-[state=open]:bg-elevated"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
