<script setup lang="ts">
import type { BatchSummary } from '~/composables/admin/useRedemptionCodesPage'

defineProps<{
  batches: BatchSummary[]
}>()

const emit = defineEmits<{
  filter: [batchId: string]
  toggle: [batchId: string, enabled: boolean]
  delete: [batchId: string, includeUsed: boolean]
}>()
</script>

<template>
  <UCard v-if="batches.length > 0">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-mdi-package-variant"
          class="size-5 text-muted"
        />
        <h3 class="text-lg font-semibold text-highlighted">
          最近批次
        </h3>
        <span class="ml-auto text-xs text-muted">
          {{ batches.length }} 个批次
        </span>
      </div>
    </template>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="b in batches.slice(0, 8)"
        :key="b.batchId"
        class="rounded-lg border border-default p-3 bg-elevated/30"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-xs text-muted truncate">
            {{ b.batchId }}
          </span>
          <UDropdownMenu
            :items="[[
              { label: '只看本批次', icon: 'i-mdi-filter-variant', onSelect: () => emit('filter', b.batchId) },
              { label: '禁用整批', icon: 'i-mdi-toggle-switch-off-outline', onSelect: () => emit('toggle', b.batchId, false) },
              { label: '启用整批', icon: 'i-mdi-toggle-switch-outline', onSelect: () => emit('toggle', b.batchId, true) }
            ], [
              { label: '删除未使用', icon: 'i-mdi-delete-outline', onSelect: () => emit('delete', b.batchId, false) },
              { label: '删除全部', icon: 'i-mdi-delete-alert-outline', color: 'error' as const, onSelect: () => emit('delete', b.batchId, true) }
            ]]"
          >
            <UButton
              icon="i-mdi-dots-vertical"
              size="xs"
              variant="ghost"
              color="neutral"
            />
          </UDropdownMenu>
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-xl font-semibold tabular-nums text-success">
            +{{ b.amount.toLocaleString() }}
          </span>
          <span class="text-xs text-muted">/ 张</span>
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-muted">
          <span>{{ b.total }} 张</span>
          <span class="tabular-nums">
            使用 {{ b.usedTotal }}/{{ b.maxUsesTotal }}
          </span>
        </div>
        <div
          v-if="b.note"
          class="mt-1 text-xs text-muted truncate"
          :title="b.note"
        >
          {{ b.note }}
        </div>
      </div>
    </div>
  </UCard>
</template>
