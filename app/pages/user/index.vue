<script setup lang="ts">
import { USER_OVERVIEW_PATH } from '~/constants/user-sections/overview'

definePageMeta({
  middleware: [
    'auth-user',
    () => navigateTo(USER_OVERVIEW_PATH, { replace: true })
  ]
})
</script>

<template>
  <div />
</template>
