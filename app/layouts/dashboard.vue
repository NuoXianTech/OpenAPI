<script setup lang="ts">
import {
  createAdminDashboardConfig,
  createUserDashboardConfig,
  type DashboardConfig,
  type DashboardStaticConfig
} from '~/constants/dashboard-config'

interface DashboardLayoutProps {
  dashboardId: DashboardConfig['id']
}

const props = defineProps<DashboardLayoutProps>()
const { user } = useAuth()
const { t } = useI18n()

function removeDashboardControlFocusFrame(defaultClasses: string): string {
  const classes = defaultClasses
    .replace(/\bfocus-visible:outline-3\b/g, '')
    .replace(/\bfocus-visible:ring-(?:primary|secondary|inverted)\b/g, 'focus-visible:ring-accented')

  return `${classes} focus-visible:outline-none`
}

const dashboardFormUi = {
  input: {
    base: removeDashboardControlFocusFrame
  },
  textarea: {
    base: removeDashboardControlFocusFrame
  },
  select: {
    base: removeDashboardControlFocusFrame
  },
  selectMenu: {
    base: removeDashboardControlFocusFrame
  }
} as const

const dashboardConfig = computed<DashboardStaticConfig>(() => resolveDashboardConfig(props.dashboardId))

function resolveDashboardConfig(dashboardId: DashboardConfig['id']): DashboardStaticConfig {
  const context = { t, isAdmin: user.value?.role === 'admin' }

  return dashboardId === 'admin'
    ? createAdminDashboardConfig(context)
    : createUserDashboardConfig(context)
}
</script>

<template>
  <UTheme :ui="dashboardFormUi">
    <DashboardLayoutBase :config="dashboardConfig">
      <slot />
    </DashboardLayoutBase>
  </UTheme>
</template>
