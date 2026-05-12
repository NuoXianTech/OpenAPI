<script setup lang="ts" generic="T">
import type { TableColumn } from '@nuxt/ui'

const props = withDefaults(defineProps<{
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: string
  page?: number
  pageSize?: number
  total?: number
  ui?: Record<string, string>
}>(), {
  loading: false,
  emptyTitle: '暂无数据',
  emptyIcon: 'i-mdi-inbox-outline',
  page: 1,
  pageSize: 0,
  total: 0
})

const emit = defineEmits<{
  'update:page': [value: number]
}>()

const showPagination = computed(() => props.pageSize > 0 && props.total > props.pageSize)
const showEmpty = computed(() => !props.loading && props.data.length === 0)

const baseUi = {
  base: 'table-fixed',
  thead: '[&>tr]:bg-elevated/50',
  th: 'py-2',
  td: 'py-2 align-middle'
}
const mergedUi = computed(() => ({ ...baseUi, ...(props.ui || {}) }))

function onPageChange(p: number) {
  emit('update:page', p)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <DashboardEmpty
      v-if="showEmpty"
      :icon="emptyIcon"
      :title="emptyTitle"
      :description="emptyDescription"
    >
      <template
        v-if="$slots['empty-actions']"
        #actions
      >
        <slot name="empty-actions" />
      </template>
    </DashboardEmpty>

    <UTable
      v-else
      :data="data"
      :columns="columns"
      :loading="loading"
      :ui="mergedUi"
    />

    <div
      v-if="showPagination"
      class="flex items-center justify-between gap-3 border-t border-default pt-3"
    >
      <span class="text-xs text-muted tabular-nums">
        共 {{ total.toLocaleString() }} 条
      </span>
      <UPagination
        :page="page"
        :items-per-page="pageSize"
        :total="total"
        size="sm"
        @update:page="onPageChange"
      />
    </div>
  </div>
</template>
