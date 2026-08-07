<script setup lang="ts">
import type { UserCreditConsumptionDailyRow } from '#shared/types/user-credits'

interface UserCreditsConsumptionCardProps {
  rows: UserCreditConsumptionDailyRow[]
  loading?: boolean
}

withDefaults(defineProps<UserCreditsConsumptionCardProps>(), { loading: false })
</script>

<template>
  <DashboardTableCard
    :title="$t('user.credits.consumption.title')"
    :description="$t('user.credits.consumption.description')"
    icon="i-mdi-chart-timeline-variant"
  >
    <ClientOnly>
      <Suspense>
        <LazyUserCreditsConsumptionChart
          :rows="rows"
          :loading="loading"
        />

        <template #fallback>
          <div class="h-[360px] rounded-lg border border-default p-3 sm:p-4">
            <USkeleton class="size-full" />
          </div>
        </template>
      </Suspense>

      <template #fallback>
        <div class="h-[360px] rounded-lg border border-default p-3 sm:p-4">
          <USkeleton class="size-full" />
        </div>
      </template>
    </ClientOnly>
  </DashboardTableCard>
</template>
