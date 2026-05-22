<script setup lang="ts">
import { adminSystemLinks } from '~/constants/admin-sections/system'

useHead({ title: '系统' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })
</script>

<template>
  <UDashboardPanel id="admin-system">
    <template #header>
      <UDashboardNavbar title="系统">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <UNavigationMenu
          :items="adminSystemLinks"
          highlight
          class="-mx-1 flex-1"
        />
      </UDashboardToolbar>
    </template>

    <template #body>
      <NuxtPage />
    </template>
  </UDashboardPanel>
</template>
