<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem, DropdownMenuItem } from '@nuxt/ui'
import { useSiteSettings } from '~/composables/useSiteSettings'
import type { DashboardConfig } from '~/constants/dashboard-config'
import {
  dashboardConfigInjectionKey,
  type ResolvedDashboardConfig
} from '~/composables/dashboard/useDashboardConfig'

type StaticBrandConfig = Omit<DashboardConfig, 'brand'> & { brand: (siteName: string) => DashboardConfig['brand'] }

const props = defineProps<{
  config: StaticBrandConfig
}>()

const { settings } = useSiteSettings()
const { user, logout } = useAuth()
const router = useRouter()

const siteName = computed(() => settings.value?.siteName || 'OpenAPI')

const resolved = computed<ResolvedDashboardConfig>(() => ({
  ...props.config,
  brand: props.config.brand(siteName.value)
}))

provide(dashboardConfigInjectionKey, reactive(resolved.value) as unknown as ResolvedDashboardConfig)

// 给 mobile drawer 用
const open = ref(false)

const brandDropdownItems = computed<DropdownMenuItem[][]>(() => [[
  { label: resolved.value.brand.label, icon: resolved.value.brand.icon, disabled: true }
]])

// 命令面板：直接复用导航分组 + 快捷动作（仅过滤 to 不是字符串的项）
const searchTerm = ref('')
const searchGroups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => {
  const navGroups = resolved.value.groups.reduce<CommandPaletteGroup<CommandPaletteItem>[]>((acc, g, idx) => {
    const items = g.items.filter(item => typeof item.to === 'string') as CommandPaletteItem[]
    if (items.length) acc.push({ id: `nav-${idx}`, label: g.label || '导航', items })
    return acc
  }, [])

  if (resolved.value.quickActions?.length) {
    navGroups.unshift({
      id: 'quick-actions',
      label: '快捷操作',
      items: resolved.value.quickActions as CommandPaletteItem[]
    })
  }

  return navGroups
})
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      :id="resolved.id"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <UDropdownMenu
          :items="brandDropdownItems"
          :content="{ align: 'start' }"
          :ui="{ content: 'w-48' }"
        >
          <UButton
            :label="collapsed ? undefined : resolved.brand.label"
            :icon="resolved.brand.icon"
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
        <UDashboardSearchButton
          v-if="!collapsed"
          class="mb-2"
        />

        <template
          v-for="(group, gIdx) in resolved.groups"
          :key="gIdx"
        >
          <div
            v-if="group.label && !collapsed"
            class="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted"
          >
            {{ group.label }}
          </div>
          <UNavigationMenu
            :collapsed="collapsed"
            :items="group.items"
            orientation="vertical"
            :tooltip="collapsed"
          />
        </template>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="resolved.footerLinks"
          orientation="vertical"
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="[[
            { type: 'label' as const, label: user?.email || user?.username || resolved.brand.label }
          ], ...((resolved.userMenuExtra?.({ logout }) || []) as DropdownMenuItem[][]), [
            {
              label: '退出登录',
              icon: 'i-mdi-logout',
              color: 'error' as const,
              async onSelect() {
                await logout()
                await router.push(resolved.loginRedirect)
              }
            }
          ]]"
          :content="{ align: 'start', collisionPadding: 12 }"
          :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
        >
          <UButton
            :label="collapsed ? undefined : (user?.displayName || user?.username || resolved.brand.label)"
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

    <UDashboardSearch
      v-model:search-term="searchTerm"
      :groups="searchGroups"
      placeholder="搜索页面或操作…（Ctrl/⌘+K）"
    />

    <slot />
  </UDashboardGroup>
</template>
