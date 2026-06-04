<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { FriendLinkItem } from '~/composables/link/types'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/useClientPagination'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const toast = useToast()
const confirm = useConfirmDialog()

const { data, status, refresh } = useLazyFetch<FriendLinkItem[]>('/api/admin/friend-links/list', {
  default: () => []
})
const items = computed(() => data.value || [])
const { page, pageSize, total, paginated } = useClientPagination(items, 10)

const modalOpen = ref(false)
const editItem = ref<FriendLinkItem | null>(null)

function openAdd() {
  editItem.value = null
  modalOpen.value = true
}
function openEdit(item: FriendLinkItem) {
  editItem.value = item
  modalOpen.value = true
}
async function openDelete(item: FriendLinkItem) {
  await confirm({
    title: `删除: ${item.title}`,
    onConfirm: async () => {
      try {
        await $fetch('/api/admin/friend-links/delete', { method: 'POST', body: { id: item.id } })
        toast.add({ title: '删除成功', color: 'success' })
        await refresh()
      } catch (err) {
        toast.add({ title: '删除失败', color: 'error' })
        throw err
      }
    }
  })
}

function getRowItems(row: FriendLinkItem): DropdownMenuItem[] {
  return [
    { label: '编辑', icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) }
  ]
}

const columns: TableColumn<FriendLinkItem>[] = [
  { accessorKey: 'title', header: '标题' },
  { accessorKey: 'url', header: 'URL' },
  { accessorKey: 'description', header: '描述' },
  { accessorKey: 'isActive', header: '状态' },
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
        新增链接
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
      <template #isActive-cell="{ row }">
        <UBadge
          :color="row.original.isActive ? 'success' : 'neutral'"
          variant="subtle"
        >
          {{ row.original.isActive ? '正常' : '停用' }}
        </UBadge>
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

    <AdminLinkModal
      v-model:open="modalOpen"
      :item="editItem"
      @saved="refresh()"
    />
  </div>
</template>
