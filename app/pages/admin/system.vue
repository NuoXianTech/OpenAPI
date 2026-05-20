<script setup lang="ts">
import SystemSettingsSection from '~/components/admin/sections/SystemSettingsSection.vue'
import SystemOauthProvidersSection from '~/components/admin/sections/SystemOauthProvidersSection.vue'
import SystemOperationLogSection from '~/components/admin/sections/SystemOperationLogSection.vue'
import SystemProfileSection from '~/components/admin/sections/SystemProfileSection.vue'
import { useTabHashSync } from '~/composables/dashboard/useTabHashSync'

useHead({ title: '系统' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const tabs = [
  { value: 'settings', label: '站点设置', icon: 'i-mdi-cog-outline' },
  { value: 'oauth-providers', label: '第三方登录', icon: 'i-mdi-shield-key-outline' },
  { value: 'operation-logs', label: '操作日志', icon: 'i-mdi-clipboard-text-clock-outline' },
  { value: 'profile', label: '个人信息', icon: 'i-mdi-account-circle-outline' }
]
const active = useTabHashSync({ tabs })
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
      <div class="px-4 pt-3 border-b border-default">
        <UTabs
          v-model="active"
          :items="tabs"
          :content="false"
          variant="link"
        />
      </div>
    </template>

    <template #body>
      <SystemSettingsSection v-if="active === 'settings'" />
      <SystemOauthProvidersSection v-else-if="active === 'oauth-providers'" />
      <SystemOperationLogSection v-else-if="active === 'operation-logs'" />
      <SystemProfileSection v-else-if="active === 'profile'" />
    </template>
  </UDashboardPanel>
</template>
