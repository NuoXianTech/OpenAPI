<script setup lang="ts">
import { useUserCreditsPage } from '~/composables/user/use-user-credits-page'

definePageMeta({ layout: 'user', middleware: 'auth-user' })

const {
  checkin,
  checkinLoading,
  isCheckingIn,
  performCheckin,
  fetchCheckinStatus,
  redeemRecords,
  redeem,
  fetchRedeemRecords
} = useUserCreditsPage()

onMounted(() => {
  void fetchCheckinStatus()
  void fetchRedeemRecords()
})
</script>

<template>
  <div class="space-y-6">
    <UserCreditsCheckinCard
      :status="checkin"
      :loading="checkinLoading"
      :submitting="isCheckingIn"
      :on-checkin="performCheckin"
    />

    <UserCreditsRedeemCard
      :records="redeemRecords"
      :on-redeem="redeem"
    />
  </div>
</template>
