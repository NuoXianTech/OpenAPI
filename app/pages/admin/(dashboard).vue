<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth-admin', 'dashboard-root-redirect']
})
</script>

<template>
  <NuxtPage />
</template>
