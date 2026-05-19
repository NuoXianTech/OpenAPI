<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

interface ApiCategoryItem {
  id: number
  code: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  parentId: number | null
  sortOrder: number
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

const toast = useToast()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const USwitch = resolveComponent('USwitch')

const { data, status, refresh } = useLazyFetch<ApiCategoryItem[]>('/api/admin/api-categories/list', {
  default: () => []
})
const items = computed<ApiCategoryItem[]>(() => data.value || [])

const modalOpen = ref(false)
const editItem = ref<ApiCategoryItem | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<ApiCategoryItem | null>(null)
const deleteLoading = ref(false)

function openAdd() {
  editItem.value = null
  modalOpen.value = true
}
function openEdit(item: ApiCategoryItem) {
  editItem.value = item
  modalOpen.value = true
}
function openDelete(item: ApiCategoryItem) {
  deleteTarget.value = item
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch('/api/admin/api-categories/delete', {
      method: 'POST',
      body: { id: deleteTarget.value.id }
    })
    toast.add({ title: '已删除', color: 'success' })
    deleteOpen.value = false
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

async function quickToggle(row: ApiCategoryItem, value: boolean) {
  try {
    await $fetch('/api/admin/api-categories/update', {
      method: 'PUT',
      body: { id: row.id, isEnabled: value }
    })
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '操作失败', color: 'error' })
  }
}

function getRowItems(row: ApiCategoryItem): DropdownMenuItem[] {
  return [
    { label: '编辑', icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) }
  ]
}

const columns: TableColumn<ApiCategoryItem>[] = [
  {
    accessorKey: 'code',
    header: '编码',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.original.code)
  },
  {
    accessorKey: 'name',
    header: '名称',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
      row.original.icon ? h(resolveComponent('UIcon'), { name: row.original.icon, class: 'size-4 text-muted' }) : null,
      h('span', { class: 'font-medium' }, row.original.name)
    ].filter(Boolean))
  },
  {
    accessorKey: 'description',
    header: '描述',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted truncate max-w-[280px] block' }, row.original.description || '-')
  },
  {
    accessorKey: 'sortOrder',
    header: '排序',
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, row.original.sortOrder)
  },
  {
    accessorKey: 'color',
    header: '颜色',
    cell: ({ row }) => row.original.color
      ? h(UBadge, { variant: 'subtle', color: 'neutral' }, () => row.original.color)
      : h('span', { class: 'text-muted' }, '-')
  },
  {
    id: 'isEnabled',
    header: '启用',
    cell: ({ row }) => h(USwitch, {
      'modelValue': row.original.isEnabled,
      'onUpdate:modelValue': (val: boolean) => quickToggle(row.original, val)
    })
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, {
      items: getRowItems(row.original),
      content: { align: 'end' }
    }, () => h(UButton, {
      icon: 'i-mdi-dots-vertical',
      color: 'neutral',
      variant: 'ghost',
      size: 'sm'
    })))
  }
]
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-end gap-2">
      <UButton
        icon="i-mdi-plus"
        @click="openAdd"
      >
        新建分类
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-mdi-refresh"
        :loading="status === 'pending'"
        @click="refresh()"
      >
        刷新
      </UButton>
    </div>

    <UTable
      :data="items"
      :columns="columns"
      :loading="status === 'pending'"
      :ui="{
        base: 'table-fixed',
        thead: '[&>tr]:bg-elevated/50',
        th: 'py-2',
        td: 'py-2 align-middle'
      }"
    />

    <AdminApiCategoryModal
      v-model:open="modalOpen"
      :item="editItem"
      @saved="refresh()"
    />
    <AdminDeleteModal
      v-model:open="deleteOpen"
      :loading="deleteLoading"
      :title="`删除分类: ${deleteTarget?.name}`"
      description="删除后该分类不再可选；已挂在此分类下的接口将变为未分类。"
      @confirm="confirmDelete"
    />
  </div>
</template>
