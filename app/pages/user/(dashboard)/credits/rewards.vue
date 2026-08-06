<script setup lang="ts">
import { useUserCreditsPage } from '~/composables/user/use-user-credits-page'

const {
  checkin,
  checkinStatus,
  isCheckingIn,
  performCheckin,
  fetchCheckinStatus,
  checkinCalendar,
  checkinCalendarLoading,
  fetchCheckinCalendar,
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
  <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.58fr)] xl:items-start">
    <div class="space-y-6">
      <UserCreditsCheckinCard
        :status="checkin"
        :has-error="checkinStatus === 'error'"
        :submitting="isCheckingIn"
        :on-checkin="performCheckin"
      />

      <UserCreditsRedeemCard
        :records="redeemRecords"
        :on-redeem="redeem"
      />
    </div>

    <UserCreditsCheckinCalendar
      :history="checkinCalendar"
      :loading="checkinCalendarLoading"
      :on-month-change="fetchCheckinCalendar"
    />
  </div>
</template>
