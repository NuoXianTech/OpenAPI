<script setup lang="ts">
import { userCreditsSection } from '~/constants/dashboard-sections'
</script>

<template>
  <DashboardSectionShell v-bind="userCreditsSection">
    <template #right>
      <UserHeaderActions />
    </template>
  </DashboardSectionShell>
</template>
