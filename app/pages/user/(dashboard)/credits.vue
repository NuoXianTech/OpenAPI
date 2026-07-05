<script setup lang="ts">
import { userCreditsLinks } from '~/constants/user-sections/credits'
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
