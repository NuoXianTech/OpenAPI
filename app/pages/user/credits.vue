<script setup lang="ts">
import { userCreditsLinks } from '~/constants/user-sections/credits'

definePageMeta({ layout: 'user', middleware: 'auth-user' })
</script>

<template>
  <DashboardSectionShell
    id="user-credits"
    title="积分"
    :items="userCreditsLinks"
  >
    <template #right>
      <UserHeaderActions />
    </template>
  </DashboardSectionShell>
</template>
