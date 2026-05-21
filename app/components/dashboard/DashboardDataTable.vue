<script setup lang="ts" generic="T">
import type { TableColumn } from '@nuxt/ui'

const {
  data,
  loading = false,
  emptyTitle = '暂无数据',
  emptyIcon = 'i-mdi-inbox-outline',
  page = 1,
  pageSize = 0,
  total = 0
} = defineProps<{
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
}>()

const emit = defineEmits<{
  'update:page': [value: number]
}>()

const showPagination = computed(() => pageSize > 0 && total > pageSize)
const showEmpty = computed(() => !loading && data.length === 0)

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
    >
      <template
        v-for="(_, name) in $slots"
        :key="name"
        #[name]="slotData"
      >
        <slot
          :name="name"
          v-bind="slotData ?? {}"
        />
      </template>
    </UTable>

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
