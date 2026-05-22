<script setup lang="ts">
import { adminContentLinks } from '~/constants/admin-sections/content'

useHead({ title: '内容管理' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })
</script>

<template>
  <UDashboardPanel id="admin-content">
    <template #header>
      <UDashboardNavbar title="内容管理">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <UNavigationMenu
          :items="adminContentLinks"
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
