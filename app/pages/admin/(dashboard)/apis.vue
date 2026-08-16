<script setup lang="ts">
import { provideAdminPlatformContext } from '~/composables/admin/use-admin-platform-context'
import { createAdminApisSection } from '~/constants/dashboard-sections'

const { t } = useI18n()
const adminApisSection = computed(() => createAdminApisSection({ t }))
provideAdminPlatformContext()
</script>

<template>
  <DashboardSectionShell v-bind="adminApisSection" />
</template>
