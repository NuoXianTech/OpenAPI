<script setup lang="ts">
import MemberUsersSection from '~/components/admin/sections/MemberUsersSection.vue'
import MemberCreditTransactionSection from '~/components/admin/sections/MemberCreditTransactionSection.vue'
import MemberRedemptionCodeSection from '~/components/admin/sections/MemberRedemptionCodeSection.vue'
import MemberRedemptionRecordSection from '~/components/admin/sections/MemberRedemptionRecordSection.vue'
import { useTabHashSync } from '~/composables/dashboard/useTabHashSync'
import { adminMembersTabs } from '~/constants/admin-sections/members'

useHead({ title: '会员中心' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const active = useTabHashSync({ tabs: adminMembersTabs })
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
        <template #left>
          <UTabs
            v-model="active"
            :items="adminMembersTabs"
            :content="false"
            variant="link"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <MemberUsersSection v-if="active === 'users'" />
      <MemberCreditTransactionSection v-else-if="active === 'credit-transactions'" />
      <MemberRedemptionCodeSection v-else-if="active === 'redemption-codes'" />
      <MemberRedemptionRecordSection v-else-if="active === 'redemption-records'" />
    </template>
  </UDashboardPanel>
</template>
