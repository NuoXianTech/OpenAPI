<script setup lang="ts">
import { adminMembersLinks } from '~/constants/admin-sections/members'

useHead({ title: '会员中心' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })
</script>

<template>
  <UDashboardPanel id="admin-members">
    <template #header>
      <UDashboardNavbar title="会员中心">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <UNavigationMenu
          :items="adminMembersLinks"
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
