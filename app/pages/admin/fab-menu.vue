<script lang="ts" setup>
definePageMeta({ middleware: 'auth-admin' })
await navigateTo({ path: '/admin', query: { tab: 'fab-menu' } }, { replace: true })
</script>

<template>
  <div class="sr-only">Redirecting...</div>
</template>
