<script setup lang="ts">
import { createUserSettingsSection } from '~/constants/dashboard-sections'

const { t } = useI18n()
const userSettingsSection = computed(() => createUserSettingsSection({ t }))
</script>

<template>
  <DashboardSectionShell v-bind="userSettingsSection" />
</template>
