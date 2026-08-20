<script setup lang="ts">
import { createAdminContentSection } from '~/constants/dashboard-config'

const { t } = useI18n()
const adminContentSection = computed(() => createAdminContentSection({ t }))
</script>

<template>
  <DashboardSectionShell v-bind="adminContentSection" />
</template>
