<script setup lang="ts">
import { adminSystemLinks } from '~/constants/admin-sections/system'
</script>

<template>
  <DashboardSectionShell
    id="admin-system"
    title="系统"
    :items="adminSystemLinks"
  />
</template>
