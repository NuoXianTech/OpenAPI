<script setup lang="ts">
import type { DashboardStaticConfig } from '~/constants/dashboard-config'
import {
  dashboardConfigInjectionKey,
  type ResolvedDashboardConfig
} from '~/composables/dashboard/use-dashboard-config'

interface DashboardLayoutBaseProps {
  config: DashboardStaticConfig
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

const navigationMenuUi = {
  root: 'dashboard-sidebar-menu',
  list: 'space-y-0.5',
  item: 'min-w-0',
  link: 'dashboard-sidebar-link min-h-8 rounded-md px-2 py-1.5',
  linkLeadingIcon: 'dashboard-sidebar-link-icon size-4',
  linkLabel: 'dashboard-sidebar-link-label',
  linkTrailing: 'dashboard-sidebar-link-trailing',
  label: 'dashboard-sidebar-menu-label'
}
</script>

<template>
  <UDashboardGroup
    class="dashboard-shell dashboard-shell-refined"
    :storage-key="`dashboard-${resolved.id}`"
  >
    <UDashboardSidebar
      :id="resolved.id"
      v-model:open="open"
      collapsible
      resizable
      class="dashboard-sidebar"
      :ui="{
        root: 'border-e-0',
        header: 'h-auto px-2.5 pb-1.5 pt-2.5',
        body: 'gap-2 px-2.5 py-2',
        footer: 'px-2.5 pb-2.5 pt-2 lg:border-t lg:border-default',
        handle: 'dashboard-sidebar-resize-handle'
      }"
    >
      <template #header="{ collapsed }">
        <div
          class="dashboard-sidebar-brand"
          :class="{ 'dashboard-sidebar-brand-collapsed': collapsed }"
        >
          <UButton
            :to="resolved.brand.to"
            :label="collapsed ? undefined : resolved.brand.label"
            :icon="resolved.brand.icon"
            :aria-label="resolved.brand.label"
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            class="dashboard-brand-trigger"
            :ui="{
              leadingIcon: 'dashboard-brand-icon size-4.5',
              label: 'truncate text-[13px] font-semibold'
            }"
          />
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
