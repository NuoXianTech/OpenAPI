<script setup lang="ts">
import { userSettingsSection } from '~/constants/dashboard-sections'
</script>

<template>
  <DashboardSectionShell v-bind="userSettingsSection" />
</template>
