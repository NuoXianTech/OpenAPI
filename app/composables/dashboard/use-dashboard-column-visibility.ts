import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { computed, ref, type ComputedRef, type Ref } from 'vue'

interface UseDashboardColumnVisibilityReturn {
  columnVisibility: Ref<Record<string, boolean>>
  columnVisibilityItems: ComputedRef<DropdownMenuItem[]>
}

function readToggleableColumn<TItem>(column: TableColumn<TItem>): { id: string, header: string } | null {
  const header = 'header' in column && typeof column.header === 'string' ? column.header : ''
  if (!header) return null

  const id = 'id' in column && typeof column.id === 'string'
    ? column.id
    : 'accessorKey' in column
      ? String(column.accessorKey)
      : ''

  return id ? { id, header } : null
}

export function useDashboardColumnVisibility<TItem>(
  columns: ComputedRef<TableColumn<TItem>[]>
): UseDashboardColumnVisibilityReturn {
  const columnVisibility = ref<Record<string, boolean>>({})
  const columnVisibilityItems = computed<DropdownMenuItem[]>(() => columns.value.flatMap((column) => {
    const item = readToggleableColumn(column)
    if (!item) return []

    return [{
      label: item.header,
      type: 'checkbox' as const,
      checked: columnVisibility.value[item.id] !== false,
      onUpdateChecked(checked: boolean) {
        columnVisibility.value = { ...columnVisibility.value, [item.id]: checked }
      },
      onSelect(event: Event) {
        event.preventDefault()
      }
    }]
  }))

  return { columnVisibility, columnVisibilityItems }
}
