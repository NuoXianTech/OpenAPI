<script setup lang="ts">
import { reasonLabel, reasonColor, type CreditSummary } from '~/composables/user/use-user-credits-page'

defineProps<{
  byReason: CreditSummary['byReason']
}>()
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
          收支分布
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
            :color="reasonColor(r.reason)"
            variant="subtle"
            size="sm"
          >
            {{ reasonLabel(r.reason) }}
          </UBadge>
          <span class="text-xs text-muted">
            {{ r.count }} 笔
          </span>
        </div>
        <span
          class="font-semibold tabular-nums shrink-0"
          :class="r.sum > 0 ? 'text-success' : r.sum < 0 ? 'text-error' : 'text-muted'"
        >
          {{ r.sum > 0 ? '+' : '' }}{{ r.sum.toLocaleString() }}
        </span>
      </div>
    </div>
  </UCard>
</template>
