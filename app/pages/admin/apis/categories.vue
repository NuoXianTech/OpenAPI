<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { parseFetchError } from '#shared/utils/clientError'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/useClientPagination'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

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
const confirm = useConfirmDialog()

const { data, status, refresh } = useLazyFetch<ApiCategoryItem[]>('/api/admin/api-categories/list', {
  default: () => []
})
const items = computed<ApiCategoryItem[]>(() => data.value || [])
const { page, pageSize, total, paginated } = useClientPagination(items, 10)

const modalOpen = ref(false)
const editItem = ref<ApiCategoryItem | null>(null)

function openAdd() {
  editItem.value = null
  modalOpen.value = true
}
function openEdit(item: ApiCategoryItem) {
  editItem.value = item
  modalOpen.value = true
}
async function openDelete(item: ApiCategoryItem) {
  await confirm({
    title: `删除分类: ${item.name}`,
    description: '删除后该分类不再可选；已挂在此分类下的接口将变为未分类。',
    onConfirm: async () => {
      try {
        await $fetch('/api/admin/api-categories/delete', {
          method: 'POST',
          body: { id: item.id }
        })
        toast.add({ title: '已删除', color: 'success' })
        await refresh()
      } catch (err: unknown) {
        toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
        throw err
      }
    }
  })
}

async function quickToggle(row: ApiCategoryItem, value: boolean) {
  try {
    await $fetch('/api/admin/api-categories/update', {
      method: 'PUT',
      body: { id: row.id, isEnabled: value }
    })
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
  }
}

function getRowItems(row: ApiCategoryItem): DropdownMenuItem[] {
  return [
    { label: '编辑', icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) }
  ]
}

const columns: TableColumn<ApiCategoryItem>[] = [
  { accessorKey: 'code', header: '编码' },
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'description', header: '描述' },
  { accessorKey: 'sortOrder', header: '排序' },
  { accessorKey: 'color', header: '颜色' },
  { id: 'isEnabled', header: '启用' },
  { id: 'actions', header: '' }
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
      class="shrink-0"
      :data="paginated"
      :columns="columns"
      :loading="status === 'pending'"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default',
        separator: 'h-0'
      }"
    >
      <template #code-cell="{ row }">
        <span class="font-mono text-xs">{{ row.original.code }}</span>
      </template>
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2">
          <UIcon
            v-if="row.original.icon"
            :name="row.original.icon"
            class="size-4 text-muted"
          />
          <span class="font-medium">{{ row.original.name }}</span>
        </div>
      </template>
      <template #description-cell="{ row }">
        <span class="text-xs text-muted truncate max-w-[280px] block">{{ row.original.description || '-' }}</span>
      </template>
      <template #sortOrder-cell="{ row }">
        <span class="tabular-nums">{{ row.original.sortOrder }}</span>
      </template>
      <template #color-cell="{ row }">
        <UBadge
          v-if="row.original.color"
          variant="subtle"
          color="neutral"
        >
          {{ row.original.color }}
        </UBadge>
        <span
          v-else
          class="text-muted"
        >-</span>
      </template>
      <template #isEnabled-cell="{ row }">
        <USwitch
          :model-value="row.original.isEnabled"
          @update:model-value="(val: boolean) => quickToggle(row.original, val)"
        />
      </template>
      <template #actions-cell="{ row }">
        <div class="text-right">
          <UDropdownMenu
            :items="getRowItems(row.original)"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-mdi-dots-vertical"
              color="neutral"
              variant="ghost"
              size="sm"
            />
          </UDropdownMenu>
        </div>
      </template>
    </UTable>

    <div
      v-if="total > 0"
      class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4"
    >
      <div class="flex items-center gap-2 text-sm text-muted">
        <span>共 {{ total.toLocaleString() }} 条</span>
        <USelect
          v-model="pageSize"
          :items="PAGE_SIZE_ITEMS"
          value-key="value"
          size="sm"
          class="w-24"
        />
      </div>
      <UPagination
        v-model:page="page"
        :items-per-page="pageSize"
        :total="total"
      />
    </div>

    <AdminApiCategoryModal
      v-model:open="modalOpen"
      :item="editItem"
      @saved="refresh()"
    />
  </div>
</template>
