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
const { user } = useAuth()

const dashboardConfig = computed<DashboardStaticConfig>(() => resolveDashboardConfig(props.dashboardId))

function resolveDashboardConfig(dashboardId: DashboardConfig['id']): DashboardStaticConfig {
  if (dashboardId === 'user' && user.value?.role === 'admin') {
    return adminDashboardConfig
  }

  return dashboardId === 'admin' ? adminDashboardConfig : userDashboardConfig
}
</script>

<template>
  <DashboardLayoutBase :config="dashboardConfig">
    <slot />
  </DashboardLayoutBase>
</template>
