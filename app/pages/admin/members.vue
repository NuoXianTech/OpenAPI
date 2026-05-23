<script setup lang="ts">
import { adminMembersLinks } from '~/constants/admin-sections/members'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })
</script>

<template>
  <AdminSectionShell
    id="admin-members"
    title="会员中心"
    :items="adminMembersLinks"
  />
</template>
