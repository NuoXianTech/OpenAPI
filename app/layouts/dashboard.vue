<script setup lang="ts">
import {
  adminDashboardConfig,
  userDashboardConfig,
  type DashboardConfig,
  type DashboardStaticConfig
} from '~/constants/dashboard-config'

interface DashboardLayoutProps {
  dashboardId: DashboardConfig['id']
}

const props = defineProps<DashboardLayoutProps>()

const dashboardConfig = computed<DashboardStaticConfig>(() => resolveDashboardConfig(props.dashboardId))

function resolveDashboardConfig(dashboardId: DashboardConfig['id']): DashboardStaticConfig {
  return dashboardId === 'admin' ? adminDashboardConfig : userDashboardConfig
}
</script>

<template>
  <DashboardLayoutBase :config="dashboardConfig">
    <slot />
  </DashboardLayoutBase>
</template>
