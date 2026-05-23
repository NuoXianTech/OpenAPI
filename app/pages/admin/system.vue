<script setup lang="ts">
import { adminSystemLinks } from '~/constants/admin-sections/system'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })
</script>

<template>
  <AdminSectionShell
    id="admin-system"
    title="系统"
    :items="adminSystemLinks"
  />
</template>
