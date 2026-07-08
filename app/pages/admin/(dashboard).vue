<script setup lang="ts">
definePageMeta({
  layout: {
    name: 'dashboard',
    props: {
      dashboardId: 'admin'
    }
  },
  middleware: 'auth-dashboard'
})
</script>

<template>
  <div class="contents">
    <NuxtPage />
    <ClientOnly>
      <AdminInitialProfileModal />
    </ClientOnly>
  </div>
</template>
