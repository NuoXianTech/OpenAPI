<script setup lang="ts">
import { createUserCreditsSection } from '~/constants/dashboard-sections'

const { t } = useI18n()
const userCreditsSection = computed(() => createUserCreditsSection({ t }))
</script>

<template>
  <DashboardSectionShell v-bind="userCreditsSection" />
</template>
