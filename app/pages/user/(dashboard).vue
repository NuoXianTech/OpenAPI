<script setup lang="ts">
definePageMeta({
  layout: 'user',
  middleware: ['auth-user', 'dashboard-root-redirect']
})
</script>

<template>
  <NuxtPage />
</template>
