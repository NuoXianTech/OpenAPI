<script setup lang="ts" generic="T">
import type { TableColumn } from '@nuxt/ui'

const {
  data,
  loading = false,
  emptyTitle = '暂无数据',
  emptyIcon = 'i-mdi-inbox-outline',
  page = 1,
  pageSize = 0,
  total = 0,
  pageSizeItems,
  rowSelection,
  getRowId,
  fixed = true,
  ui
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
  /** 传入后底部显示“每页条数”下拉（配合 v-model:page-size）；不传则只显示计数 + 分页 */
  pageSizeItems?: Array<{ label: string, value: number }>
  /** 行选择状态（配合 v-model:row-selection）；不传则禁用行选择 */
  rowSelection?: Record<string, boolean>
  /** 行唯一 id 取值函数（启用行选择时建议提供） */
  getRowId?: (row: T) => string
  /** 列宽算法：true=table-fixed 等宽（默认）；列多/内容宽的表传 false 走自动列宽 */
  fixed?: boolean
  /** 覆盖默认表格 :ui（与组件内置样式浅合并） */
  ui?: Record<string, string>
}>()

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
  'update:rowSelection': [value: Record<string, boolean>]
}>()

// 后台表格统一外观：圆角描边 + 行分隔线。原先散落在各列表页的同款 :ui 收敛到此。
const DEFAULT_TABLE_UI = {
  base: 'table-fixed border-separate border-spacing-0',
  thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
  tbody: '[&>tr]:last:[&>td]:border-b-0',
  th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
  td: 'border-b border-default',
  separator: 'h-0'
}
const tableUi = computed(() => ({
  ...DEFAULT_TABLE_UI,
  base: fixed ? DEFAULT_TABLE_UI.base : 'border-separate border-spacing-0',
  ...ui
}))

const hasPageSizeSelect = computed(() => !!pageSizeItems?.length)
const showEmpty = computed(() => !loading && data.length === 0)
const showPagination = computed(() => pageSize > 0 && total > pageSize)
// 带每页条数下拉时，只要有数据就展示底部（计数/下拉常驻）；否则沿用“仅多页时显示分页”。
const showFooter = computed(() => hasPageSizeSelect.value ? total > 0 : showPagination.value)

function onPageSizeChange(value: string | number) {
  emit('update:pageSize', Number(value))
}

function onRowSelectionChange(value: Record<string, boolean> | undefined) {
  emit('update:rowSelection', value ?? {})
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <UEmpty
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
    </UEmpty>

    <UTable
      v-else
      :data="data"
      :columns="columns"
      :loading="loading"
      :ui="tableUi"
      :row-selection="rowSelection"
      :get-row-id="getRowId"
      @update:row-selection="onRowSelectionChange"
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
      v-if="showFooter"
      class="flex items-center justify-between gap-3 border-t border-default pt-3"
    >
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted tabular-nums">
          共 {{ total.toLocaleString() }} 条
        </span>
        <USelect
          v-if="hasPageSizeSelect"
          :model-value="pageSize"
          :items="pageSizeItems"
          value-key="value"
          size="sm"
          class="w-24"
          @update:model-value="onPageSizeChange"
        />
      </div>
      <UPagination
        v-if="showPagination"
        :page="page"
        :items-per-page="pageSize"
        :total="total"
        size="sm"
        @update:page="emit('update:page', $event)"
      />
    </div>
  </div>
</template>
