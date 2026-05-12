<script setup lang="ts">
import { userDashboardConfig } from '~/constants/dashboard-config'
</script>

<template>
  <DashboardLayoutBase :config="userDashboardConfig">
    <slot />
  </DashboardLayoutBase>
</template>
