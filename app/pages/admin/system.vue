<script setup lang="ts">
import SystemSettingsSection from '~/components/admin/sections/SystemSettingsSection.vue'
import SystemOauthProvidersSection from '~/components/admin/sections/SystemOauthProvidersSection.vue'
import SystemOperationLogSection from '~/components/admin/sections/SystemOperationLogSection.vue'
import SystemProfileSection from '~/components/admin/sections/SystemProfileSection.vue'
import { useTabHashSync } from '~/composables/dashboard/useTabHashSync'
import { adminSystemTabs } from '~/constants/admin-sections/system'

useHead({ title: '系统' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const active = useTabHashSync({ tabs: adminSystemTabs })
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
        <template #left>
          <UTabs
            v-model="active"
            :items="adminSystemTabs"
            :content="false"
            variant="link"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <SystemSettingsSection v-if="active === 'settings'" />
      <SystemOauthProvidersSection v-else-if="active === 'oauth-providers'" />
      <SystemOperationLogSection v-else-if="active === 'operation-logs'" />
      <SystemProfileSection v-else-if="active === 'profile'" />
    </template>
  </UDashboardPanel>
</template>
