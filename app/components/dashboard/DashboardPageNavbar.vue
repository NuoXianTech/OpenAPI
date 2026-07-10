<script setup lang="ts">
interface DashboardPageNavbarProps {
  title: string
}

defineProps<DashboardPageNavbarProps>()
</script>

<template>
  <UDashboardNavbar
    :title="title"
    class="dashboard-navbar"
  >
    <template #leading>
      <UDashboardSidebarCollapse />
      <slot name="leading" />
    </template>
    <template #right>
      <slot name="right">
        <DashboardHeaderActions />
      </slot>
    </template>
  </UDashboardNavbar>
</template>
