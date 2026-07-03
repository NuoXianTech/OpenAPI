<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { DashboardConfig } from '~/constants/dashboard-config'
import {
  dashboardConfigInjectionKey,
  type ResolvedDashboardConfig
} from '~/composables/dashboard/use-dashboard-config'

type StaticBrandConfig = Omit<DashboardConfig, 'brand'> & { brand: (siteName: string) => DashboardConfig['brand'] }

const props = defineProps<{
  config: StaticBrandConfig
}>()

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
</script>

<template>
  <UDashboardGroup class="dashboard-shell">
    <UDashboardSidebar
      :id="resolved.id"
      v-model:open="open"
      collapsible
      resizable
      class="dashboard-sidebar"
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
            class="dashboard-brand-trigger data-[state=open]:bg-elevated"
            :ui="{ trailingIcon: 'size-5' }"
          />
        </UDropdownMenu>
      </template>

      <template #default="{ collapsed }">
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
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
