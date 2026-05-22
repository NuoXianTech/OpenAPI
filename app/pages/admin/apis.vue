<script setup lang="ts">
import { adminApisLinks } from '~/constants/admin-sections/apis'

useHead({ title: 'API 中心' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })
</script>

<template>
  <UDashboardPanel id="admin-apis">
    <template #header>
      <UDashboardNavbar title="API 中心">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <UNavigationMenu
          :items="adminApisLinks"
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
