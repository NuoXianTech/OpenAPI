<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'

const { user, logout } = useAuth()
const { settings } = useSiteSettings()
const router = useRouter()

const mainLinks = [[{
  label: '仪表盘',
  icon: 'i-mdi-view-dashboard-outline',
  to: '/admin'
}, {
  label: 'API 管理',
  icon: 'i-mdi-api',
  to: '/admin/apis'
}, {
  label: '用户管理',
  icon: 'i-mdi-account-group-outline',
  to: '/admin/users'
}, {
  label: '友情链接',
  icon: 'i-mdi-link-variant',
  to: '/admin/friend-links'
}, {
  label: '调用统计',
  icon: 'i-mdi-chart-bar',
  to: '/admin/calls'
}, {
  label: 'FAB 菜单',
  icon: 'i-mdi-plus-circle-outline',
  to: '/admin/fab-menu'
}]] satisfies NavigationMenuItem[][]

const bottomLinks = [[{
  label: '站点设置',
  icon: 'i-mdi-cog-outline',
  to: '/admin/settings'
}, {
  label: '返回前台',
  icon: 'i-mdi-arrow-left',
  to: '/'
}]] satisfies NavigationMenuItem[][]

const userMenuItems = computed<DropdownMenuItem[][]>(() => [[{
  type: 'label',
  label: user.value?.username || 'Admin'
}], [{
  label: '退出登录',
  icon: 'i-mdi-logout',
  async onSelect() {
    await logout()
    await router.push('/admin/login')
  }
}]])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="admin"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2 p-2" :class="collapsed ? 'justify-center' : ''">
          <div class="size-8 shrink-0 rounded-lg bg-default border border-default flex items-center justify-center">
            <Icon name="mdi:shield-crown-outline" size="18" />
          </div>
          <span v-if="!collapsed" class="text-sm font-semibold truncate">
            {{ settings.siteName }}
          </span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="mainLinks[0]"
          orientation="vertical"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="bottomLinks[0]"
          orientation="vertical"
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="userMenuItems"
          :content="{ align: 'center', collisionPadding: 12 }"
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
