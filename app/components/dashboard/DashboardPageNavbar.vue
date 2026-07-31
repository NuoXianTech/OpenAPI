<script setup lang="ts">
interface DashboardPageNavbarProps {
  title: string
}

defineProps<DashboardPageNavbarProps>()
</script>

<template>
  <UDashboardNavbar
    class="dashboard-navbar"
  >
    <template #leading>
      <UDashboardSidebarCollapse />
      <h1 class="min-w-0 truncate text-base leading-5 font-semibold text-highlighted">
        {{ title }}
      </h1>
      <slot name="leading" />
    </template>
    <template #right>
      <slot name="right">
        <DashboardHeaderActions />
      </slot>
    </template>
  </UDashboardNavbar>
</template>
