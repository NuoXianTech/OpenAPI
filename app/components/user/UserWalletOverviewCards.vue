<script setup lang="ts">
import type { WalletSummary } from '~/composables/user/useUserWalletPage'

const props = defineProps<{
  summary: WalletSummary
}>()

const cards = computed(() => [
  { key: 'balance', label: '当前余额', value: props.summary.balance.toLocaleString(), icon: 'i-mdi-wallet-outline', color: 'text-primary' },
  { key: 'in', label: '累计收入', value: props.summary.totalIn.toLocaleString(), icon: 'i-mdi-arrow-down-bold-circle-outline', color: 'text-success' },
  { key: 'out', label: '累计支出', value: props.summary.totalOut.toLocaleString(), icon: 'i-mdi-arrow-up-bold-circle-outline', color: 'text-error' },
  { key: 'count', label: '流水笔数', value: props.summary.totalCount.toLocaleString(), icon: 'i-mdi-format-list-numbered', color: 'text-info' },
])
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <UCard
      v-for="card in cards"
      :key="card.key"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-muted">
            {{ card.label }}
          </p>
          <p class="text-2xl font-semibold tabular-nums mt-1">
            {{ card.value }}
          </p>
        </div>
        <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0">
          <UIcon
            :name="card.icon"
            :class="card.color"
            class="size-5"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
