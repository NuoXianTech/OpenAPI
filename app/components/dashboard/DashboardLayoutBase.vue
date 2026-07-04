<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { DashboardConfig } from '~/constants/dashboard-config'
import {
  dashboardConfigInjectionKey,
  type ResolvedDashboardConfig
} from '~/composables/dashboard/use-dashboard-config'

interface StaticBrandConfig extends Omit<DashboardConfig, 'brand'> {
  brand: (siteName: string) => DashboardConfig['brand']
}

interface DashboardLayoutBaseProps {
  config: StaticBrandConfig
}

const props = defineProps<DashboardLayoutBaseProps>()

const { settings } = useSiteSettings()

const siteName = computed(() => settings.value?.siteName || 'OpenAPI')

const resolved = computed<ResolvedDashboardConfig>(() => ({
  ...props.config,
  brand: props.config.brand(siteName.value)
}))

provide(dashboardConfigInjectionKey, resolved)

// 给 mobile drawer 用
const open = ref(false)

const brandDropdownItems = computed<DropdownMenuItem[][]>(() => [[
  { label: resolved.value.brand.label, icon: resolved.value.brand.icon, disabled: true }
]])

const navigationMenuUi = {
  root: 'dashboard-sidebar-menu',
  list: 'space-y-1',
  item: 'min-w-0',
  link: 'dashboard-sidebar-link min-h-9 rounded-lg px-2.5 py-2',
  linkLeadingIcon: 'dashboard-sidebar-link-icon size-4.5',
  linkLabel: 'dashboard-sidebar-link-label text-[13px] font-medium',
  linkTrailing: 'dashboard-sidebar-link-trailing',
  label: 'dashboard-sidebar-menu-label'
}
</script>

<template>
  <UDashboardGroup class="dashboard-shell dashboard-shell-refined">
    <UDashboardSidebar
      :id="resolved.id"
      v-model:open="open"
      collapsible
      resizable
      class="dashboard-sidebar"
      :ui="{
        root: 'border-e-0',
        header: 'h-auto px-3 pb-2 pt-3',
        body: 'gap-3 px-3 py-2',
        footer: 'px-3 pb-3 pt-2 lg:border-t lg:border-default',
        handle: 'dashboard-sidebar-resize-handle'
      }"
    >
      <template #header="{ collapsed }">
        <div
          class="dashboard-sidebar-brand"
          :class="{ 'dashboard-sidebar-brand-collapsed': collapsed }"
        >
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
              class="dashboard-brand-trigger data-[state=open]:bg-elevated"
              trailing-icon="i-mdi-chevron-down"
              :ui="{
                leadingIcon: 'dashboard-brand-icon size-5',
                trailingIcon: collapsed ? 'hidden' : 'dashboard-brand-chevron size-4',
                label: 'truncate text-sm font-semibold'
              }"
            />
          </UDropdownMenu>
        </div>
      </template>

      <template #default="{ collapsed }">
        <template
          v-for="(group, gIdx) in resolved.groups"
          :key="gIdx"
        >
          <div
            v-if="group.label && !collapsed"
            class="dashboard-sidebar-group-label"
          >
            {{ group.label }}
          </div>
          <UNavigationMenu
            :collapsed="collapsed"
            :items="group.items"
            orientation="vertical"
            color="neutral"
            variant="pill"
            :tooltip="collapsed"
            :ui="navigationMenuUi"
          />
        </template>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="resolved.footerLinks"
          orientation="vertical"
          color="neutral"
          variant="pill"
          class="mt-auto"
          :ui="navigationMenuUi"
        />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
