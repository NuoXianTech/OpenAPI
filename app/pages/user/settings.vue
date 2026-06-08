<script setup lang="ts">
import { userSettingsLinks } from '~/constants/user-sections/settings'

definePageMeta({ layout: 'user', middleware: 'auth-user' })
</script>

<template>
  <UserSectionShell
    id="user-settings"
    title="个人设置"
    :items="userSettingsLinks"
  />
</template>
