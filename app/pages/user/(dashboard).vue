<script setup lang="ts">
definePageMeta({
  layout: {
    name: 'dashboard',
    props: {
      dashboardId: 'user'
    }
  },
  middleware: ['auth-user', 'dashboard-root-redirect']
})
</script>

<template>
  <NuxtPage />
</template>
