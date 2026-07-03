<script setup lang="ts">
import { adminContentLinks } from '~/constants/admin-sections/content'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })
</script>

<template>
  <DashboardSectionShell
    id="admin-content"
    title="内容管理"
    :items="adminContentLinks"
  />
</template>
