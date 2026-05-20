<script setup lang="ts">
import ApiGovernanceSection from '~/components/admin/sections/ApiGovernanceSection.vue'
import ApiCategorySection from '~/components/admin/sections/ApiCategorySection.vue'
import ApiCallsSection from '~/components/admin/sections/ApiCallsSection.vue'
import { useTabHashSync } from '~/composables/dashboard/useTabHashSync'
import { adminApiHubTabs } from '~/constants/admin-sections/api-hub'

useHead({ title: 'API 中心' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const active = useTabHashSync({ tabs: adminApiHubTabs })
</script>

<template>
  <UDashboardPanel id="admin-api-hub">
    <template #header>
      <UDashboardNavbar title="API 中心">
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
          :items="adminApiHubTabs"
          :content="false"
          variant="link"
        />
      </div>
    </template>

    <template #body>
      <ApiGovernanceSection v-if="active === 'governance'" />
      <ApiCategorySection v-else-if="active === 'categories'" />
      <ApiCallsSection v-else-if="active === 'calls'" />
    </template>
  </UDashboardPanel>
</template>
