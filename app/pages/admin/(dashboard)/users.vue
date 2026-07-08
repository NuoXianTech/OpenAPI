<script setup lang="ts">
useHead({ title: '用户管理' })
</script>

<template>
  <UDashboardPanel id="admin-users">
    <template #header>
      <UDashboardNavbar
        title="用户管理"
        class="dashboard-navbar"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="dashboard-section-page">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
