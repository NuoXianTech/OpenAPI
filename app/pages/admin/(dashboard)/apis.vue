<script setup lang="ts">
import { adminApisLinks } from '~/constants/admin-sections/apis'
</script>

<template>
  <DashboardSectionShell
    id="admin-apis"
    title="接口管理"
    :items="adminApisLinks"
  />
</template>
