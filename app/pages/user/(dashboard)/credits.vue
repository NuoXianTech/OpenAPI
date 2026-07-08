<script setup lang="ts">
import { userCreditsSection } from '~/constants/dashboard-sections'
</script>

<template>
  <DashboardSectionShell v-bind="userCreditsSection">
    <template #right>
      <DashboardHeaderActions>
        <CommonNotificationBell />
      </DashboardHeaderActions>
    </template>
  </DashboardSectionShell>
</template>
