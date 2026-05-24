<script setup lang="ts">
import { ADMIN_OVERVIEW_PATH } from '~/constants/admin-sections/overview'

definePageMeta({
  middleware: [
    'auth-admin',
    () => navigateTo(ADMIN_OVERVIEW_PATH, { replace: true })
  ]
})
</script>

<template>
  <div />
</template>
