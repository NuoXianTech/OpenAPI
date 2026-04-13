<script lang="ts" setup>
definePageMeta({ middleware: 'auth-admin' })
await navigateTo({ path: '/admin', query: { tab: 'apis' } }, { replace: true })
</script>

<template>
  <div class="sr-only">Redirecting...</div>
</template>
