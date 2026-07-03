<script setup lang="ts">
import { userSettingsLinks } from '~/constants/user-sections/settings'

definePageMeta({ layout: 'user', middleware: 'auth-user' })
</script>

<template>
  <DashboardSectionShell
    id="user-settings"
    title="个人设置"
    :items="userSettingsLinks"
  >
    <template #right>
      <UserHeaderActions />
    </template>
  </DashboardSectionShell>
</template>
