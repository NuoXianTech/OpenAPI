<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'

const { user, logout } = useAuth()
const { settings } = useSiteSettings()
const router = useRouter()

const open = ref(false)

// 静态导航，冻结避免 Vue 重复创建 reactivity proxy
const mainLinks = Object.freeze([[
  {
    label: '仪表盘',
    icon: 'i-mdi-view-dashboard-outline',
    to: '/admin',
  },
  {
    label: 'API 管理',
    icon: 'i-mdi-api',
    to: '/admin/apis',
  },
  {
    label: '用户管理',
    icon: 'i-mdi-account-group-outline',
    to: '/admin/users',
  },
  {
    label: '兑换码',
    icon: 'i-mdi-ticket-percent-outline',
    to: '/admin/redemption-codes',
  },
  {
    label: '友情链接',
    icon: 'i-mdi-link-variant',
    to: '/admin/friend-links',
  },
  {
    label: '公告管理',
    icon: 'i-mdi-bullhorn-outline',
    to: '/admin/announcements',
  },
  {
    label: '通知管理',
    icon: 'i-mdi-bell-outline',
    to: '/admin/notifications',
  },
  {
    label: '调用统计',
    icon: 'i-mdi-chart-bar',
    to: '/admin/calls',
  },
  {
    label: 'FAB 菜单',
    icon: 'i-mdi-plus-circle-outline',
    to: '/admin/fab-menu',
  },
  {
    label: '第三方登录',
    icon: 'i-mdi-shield-key-outline',
    to: '/admin/oauth-providers',
  },
]]) as unknown as NavigationMenuItem[][]

const footerLinks = Object.freeze([[
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
]]) as unknown as NavigationMenuItem[][]

const userMenuItems = computed<DropdownMenuItem[][]>(() => [[
  {
    type: 'label',
    label: user.value?.email || user.value?.username || 'Admin',
  },
], [
  {
    label: '站点设置',
    icon: 'i-mdi-cog-outline',
    to: '/admin/settings',
  },
], [
  {
    label: '退出登录',
    icon: 'i-mdi-logout',
    async onSelect() {
      await logout()
      await router.push('/admin/login')
    },
  },
]])
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      id="admin"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <UDropdownMenu
          :items="[[{ label: settings.siteName || 'OpenAPI', icon: 'i-mdi-shield-crown-outline', disabled: true }]]"
          :content="{ align: 'start' }"
          :ui="{ content: 'w-48' }"
        >
          <UButton
            :label="collapsed ? undefined : (settings.siteName || 'OpenAPI')"
            icon="i-mdi-shield-crown-outline"
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
            :label="collapsed ? undefined : (user?.username || 'Admin')"
            :trailing-icon="collapsed ? undefined : 'i-mdi-chevron-up'"
            icon="i-mdi-account-circle-outline"
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
