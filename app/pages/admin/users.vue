<script setup lang="ts">
import { adminUsersLinks } from '~/constants/admin-sections/users'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })
</script>

<template>
  <AdminSectionShell
    id="admin-users"
    title="用户中心"
    :items="adminUsersLinks"
  />
</template>
