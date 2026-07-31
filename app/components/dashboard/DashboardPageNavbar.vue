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
      <div class="flex min-w-0 items-center gap-2.5">
        <span class="hidden font-mono text-[10px] font-semibold text-primary sm:inline">CONSOLE</span>
        <span class="hidden h-3 w-px bg-default sm:block" />
        <h1 class="truncate text-base font-semibold text-highlighted">
          {{ title }}
        </h1>
      </div>
      <slot name="leading" />
    </template>
    <template #right>
      <slot name="right">
        <DashboardHeaderActions />
      </slot>
    </template>
  </UDashboardNavbar>
</template>
