<script setup lang="ts">
import { createAdminCreditsSection } from '~/constants/dashboard-config'

const { t } = useI18n()
const adminCreditsSection = computed(() => createAdminCreditsSection({ t }))
</script>

<template>
  <DashboardSectionShell v-bind="adminCreditsSection" />
</template>
