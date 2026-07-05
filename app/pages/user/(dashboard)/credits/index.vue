<script setup lang="ts">
import { useUserCreditsPage } from '~/composables/user/use-user-credits-page'

const { summary, fetchSummary } = useUserCreditsPage()

onMounted(() => {
  void fetchSummary()
})
</script>

<template>
  <div class="space-y-6">
    <UserCreditsOverviewCards :summary="summary" />

    <UserCreditsByReasonCard :by-reason="summary.byReason" />
  </div>
</template>
