<script setup lang="ts">
import MemberUsersSection from '~/components/admin/sections/MemberUsersSection.vue'
import MemberCreditTransactionSection from '~/components/admin/sections/MemberCreditTransactionSection.vue'
import MemberRedemptionCodeSection from '~/components/admin/sections/MemberRedemptionCodeSection.vue'
import MemberRedemptionRecordSection from '~/components/admin/sections/MemberRedemptionRecordSection.vue'
import { useTabHashSync } from '~/composables/dashboard/useTabHashSync'

useHead({ title: '会员中心' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const tabs = [
  { value: 'users', label: '用户', icon: 'i-mdi-account-group-outline' },
  { value: 'credit-transactions', label: '积分流水', icon: 'i-mdi-cash-multiple' },
  { value: 'redemption-codes', label: '兑换码', icon: 'i-mdi-ticket-percent-outline' },
  { value: 'redemption-records', label: '兑换记录', icon: 'i-mdi-clipboard-check-outline' }
]
const active = useTabHashSync({ tabs })
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
      <MemberUsersSection v-if="active === 'users'" />
      <MemberCreditTransactionSection v-else-if="active === 'credit-transactions'" />
      <MemberRedemptionCodeSection v-else-if="active === 'redemption-codes'" />
      <MemberRedemptionRecordSection v-else-if="active === 'redemption-records'" />
    </template>
  </UDashboardPanel>
</template>
