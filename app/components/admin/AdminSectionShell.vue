<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const props = defineProps<{
  id: string
  title: string
  items: NavigationMenuItem[]
}>()

useHead({ title: props.title })
</script>

<template>
  <UDashboardPanel :id="id">
    <template #header>
      <UDashboardNavbar
        :title="title"
        class="dashboard-navbar"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar class="dashboard-toolbar">
        <UNavigationMenu
          :items="items"
          highlight
          class="-mx-1 flex-1"
        />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="dashboard-section-page">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
