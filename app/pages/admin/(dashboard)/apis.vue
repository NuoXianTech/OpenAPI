<script setup lang="ts">
import { createAdminApisSection } from '~/constants/dashboard-sections'

const { t } = useI18n()
const adminApisSection = computed(() => createAdminApisSection({ t }))
</script>

<template>
  <DashboardSectionShell v-bind="adminApisSection" />
</template>
