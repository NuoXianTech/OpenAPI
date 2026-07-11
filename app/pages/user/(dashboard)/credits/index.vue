<script setup lang="ts">
import { useUserCreditsPage } from '~/composables/user/use-user-credits-page'

const { summary, summaryLoading, fetchSummary } = useUserCreditsPage()

onMounted(() => {
  void fetchSummary()
})
</script>

<template>
  <div class="space-y-6">
    <UserCreditsOverviewCards :summary="summary" />

    <UserCreditsConsumptionTable
      :rows="summary.consumptionLast7Days"
      :loading="summaryLoading"
    />

    <UserCreditsByReasonCard :by-reason="summary.byReason" />
  </div>
</template>
