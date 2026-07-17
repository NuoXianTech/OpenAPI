<script setup lang="ts">
import { createAdminSystemSection } from '~/constants/dashboard-sections'

const { t } = useI18n()
const adminSystemSection = computed(() => createAdminSystemSection({ t }))
</script>

<template>
  <DashboardSectionShell v-bind="adminSystemSection" />
</template>
