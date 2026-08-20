<script setup lang="ts">
import { createAdminLogsSection } from '~/constants/dashboard-config'

const { t } = useI18n()
const adminLogsSection = computed(() => createAdminLogsSection({ t }))
</script>

<template>
  <DashboardSectionShell v-bind="adminLogsSection" />
</template>
