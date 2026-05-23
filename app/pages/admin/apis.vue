<script setup lang="ts">
import { adminApisLinks } from '~/constants/admin-sections/apis'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })
</script>

<template>
  <AdminSectionShell
    id="admin-apis"
    title="API 中心"
    :items="adminApisLinks"
  />
</template>
