<script setup lang="ts">
import { adminUsersLinks } from '~/constants/admin-sections/users'
</script>

<template>
  <DashboardSectionShell
    id="admin-users"
    title="用户中心"
    :items="adminUsersLinks"
  />
</template>
