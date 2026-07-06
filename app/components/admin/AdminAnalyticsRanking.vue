<script setup lang="ts">
import type { AdminAnalyticsRankItem } from '~~/shared/types/admin-analytics'

interface Props {
  ranking: AdminAnalyticsRankItem[]
}

const props = defineProps<Props>()

const maxCalls = computed(() => Math.max(...props.ranking.map(r => r.totalCalls), 1))
const widthPercent = (value: number) => Math.min(100, Math.max(0, (value / maxCalls.value) * 100))

const formatCount = (val: number) => val.toLocaleString()
const formatRate = (val: number) => `${val.toFixed(2)}%`
</script>

<template>
  <UEmpty
    v-if="ranking.length === 0"
    icon="i-lucide-trophy"
    title="暂无调用数据"
    class="h-64"
  />

  <ol
    v-else
    class="rank-list"
  >
    <li
      v-for="item in ranking"
      :key="item.apiId"
      class="rank-item"
    >
      <div class="flex items-center gap-3">
        <UBadge
          :color="item.rank <= 3 ? 'primary' : 'neutral'"
          :variant="item.rank <= 3 ? 'solid' : 'soft'"
          class="w-7 shrink-0 justify-center rounded-md tabular-nums"
        >
          {{ item.rank }}
        </UBadge>
        <div class="min-w-0 flex-1">
          <div
            class="truncate text-sm font-medium text-default"
            :title="item.name"
          >
            {{ item.name }}
          </div>
          <div
            class="truncate font-mono text-xs text-muted"
            :title="item.apiPath"
          >
            {{ item.apiPath }}
          </div>
        </div>
        <div class="shrink-0 text-right">
          <div class="text-sm font-semibold tabular-nums text-highlighted">
            {{ formatCount(item.totalCalls) }}
          </div>
          <div class="text-xs text-muted tabular-nums">
            {{ formatRate(item.successRate) }}
          </div>
        </div>
      </div>
      <div class="rank-bar">
        <span :style="{ width: `${widthPercent(item.totalCalls)}%` }" />
      </div>
    </li>
  </ol>
</template>

<style scoped>
.rank-list {
  display: flex;
  flex-direction: column;
}
.rank-item {
  padding: 12px 0;
  border-top: 1px solid var(--ui-border);
}
.rank-item:first-child {
  border-top: 0;
}
.rank-bar {
  position: relative;
  margin-top: 8px;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ui-border) 70%, transparent);
  overflow: hidden;
}
.rank-bar span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--ui-primary) 80%, var(--ui-info) 20%),
    color-mix(in srgb, var(--ui-info) 70%, var(--ui-success) 30%));
}
</style>
