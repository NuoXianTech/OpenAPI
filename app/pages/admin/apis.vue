<script setup lang="ts">
import { adminApisLinks } from '~/constants/admin-sections/apis'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })
</script>

<template>
  <AdminSectionShell
    id="admin-apis"
    title="接口管理"
    :items="adminApisLinks"
  />
</template>
