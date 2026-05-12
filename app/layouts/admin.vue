<script setup lang="ts">
import { adminDashboardConfig } from '~/constants/dashboard-config'
</script>

<template>
  <DashboardLayoutBase :config="adminDashboardConfig">
    <slot />
  </DashboardLayoutBase>
</template>
