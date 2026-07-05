<script setup lang="ts">
definePageMeta({
  layout: {
    name: 'dashboard',
    props: {
      dashboardId: 'admin'
    }
  },
  middleware: ['auth-admin', 'dashboard-root-redirect']
})
</script>

<template>
  <NuxtPage />
</template>
