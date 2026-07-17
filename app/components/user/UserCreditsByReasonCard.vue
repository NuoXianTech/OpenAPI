<script setup lang="ts">
import type { CreditSummary } from '~/composables/user/use-user-credits-page'
import { useCreditReasonMeta } from '~/composables/credits/use-credit-reason-meta'

defineProps<{
  byReason: CreditSummary['byReason']
}>()
const { locale } = useI18n()
const { getReasonColor, getReasonLabel } = useCreditReasonMeta()
</script>

<template>
  <UCard v-if="byReason.length > 0">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-mdi-chart-pie-outline"
          class="size-5 text-muted"
        />
        <h3 class="text-lg font-semibold text-highlighted">
          {{ $t('user.credits.distribution.title') }}
        </h3>
      </div>
    </template>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="r in byReason"
        :key="r.reason"
        class="flex items-center justify-between gap-2 rounded-lg border border-default p-3 bg-elevated/30"
      >
        <div class="flex items-center gap-2 min-w-0">
          <UBadge
            :color="getReasonColor(r.reason)"
            variant="subtle"
            size="sm"
          >
            {{ getReasonLabel(r.reason) }}
          </UBadge>
          <span class="text-xs text-muted">
            {{ $t('user.credits.distribution.records', { count: r.count.toLocaleString(locale) }) }}
          </span>
        </div>
        <span
          class="font-semibold tabular-nums shrink-0"
          :class="r.sum > 0 ? 'text-success' : r.sum < 0 ? 'text-error' : 'text-muted'"
        >
          {{ r.sum > 0 ? '+' : '' }}{{ r.sum.toLocaleString(locale) }}
        </span>
      </div>
    </div>
  </UCard>
</template>
