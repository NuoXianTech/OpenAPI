<script lang="ts" setup>
definePageMeta({ middleware: 'auth-admin' })
await navigateTo({ path: '/admin', query: { tab: 'calls' } }, { replace: true })
</script>

<template>
  <div class="sr-only">Redirecting...</div>
</template>
