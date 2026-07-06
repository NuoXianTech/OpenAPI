<script setup lang="ts" generic="T">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

const { columns, columnVisibility, label = '显示列' } = defineProps<{
  /** 与表格同源的列定义，从中提取可隐藏列 */
  columns: TableColumn<T>[]
  /** 列可见性映射，与表格 v-model:column-visibility 共享同一份 ref */
  columnVisibility: Record<string, boolean>
  /** 触发按钮文案 */
  label?: string
}>()

const emit = defineEmits<{
  'update:columnVisibility': [value: Record<string, boolean>]
}>()

interface ToggleableColumn {
  id: string
  header: string
}

// TableColumn 是联合类型，id/header/accessorKey 不一定存在，用 in 守卫安全收窄。
// 仅保留拥有非空字符串表头的列；select / actions 等结构列因无表头被排除。
function readColumn(column: TableColumn<T>): ToggleableColumn | undefined {
  const header = 'header' in column && typeof column.header === 'string' ? column.header : ''
  if (!header) return undefined

  const id = 'id' in column && typeof column.id === 'string'
    ? column.id
    : 'accessorKey' in column
      ? String(column.accessorKey)
      : ''
  if (!id) return undefined

  return { id, header }
}

const toggleableColumns = computed(() =>
  columns.map(readColumn).filter((column): column is ToggleableColumn => column != null)
)

// columnVisibility 中缺省（无 key）视为可见，仅显式 false 才隐藏。
const items = computed<DropdownMenuItem[]>(() =>
  toggleableColumns.value.map(column => ({
    label: column.header,
    type: 'checkbox' as const,
    checked: columnVisibility[column.id] !== false,
    onUpdateChecked(checked: boolean) {
      emit('update:columnVisibility', { ...columnVisibility, [column.id]: checked })
    },
    // 勾选后阻止菜单关闭，便于连续切换多列。
    onSelect(event: Event) {
      event.preventDefault()
    }
  }))
)
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'end' }"
  >
    <UButton
      :label="label"
      color="neutral"
      variant="outline"
      icon="i-lucide-columns-3"
    />
  </UDropdownMenu>
</template>
