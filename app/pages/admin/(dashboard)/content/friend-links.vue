<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { FriendLinkItem } from '#shared/types/content'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

const toast = useToast()
const confirm = useConfirmDialog()

const { data, loading, refresh } = usePrivateResource<FriendLinkItem[]>({
  path: '/api/admin/friend-links/list',
  defaultData: () => []
})
const { page, pageSize, total, paginated } = useClientPagination(data, 10)

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
  <div class="space-y-6">
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
        :loading="loading"
        @click="refresh()"
      >
        刷新
      </UButton>
    </div>

    <DashboardTableCard
      title="友链列表"
      icon="i-mdi-link-variant"
      :total="total"
    >
      <DashboardDataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        :data="paginated"
        :columns="columns"
        :loading="loading"
        :total="total"
        :page-size-items="PAGE_SIZE_ITEMS"
        empty-title="暂无友链"
        empty-icon="i-mdi-link-variant"
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
          <DashboardRowActions :items="getRowItems(row.original)" />
        </template>
      </DashboardDataTable>
    </DashboardTableCard>

    <AdminLinkModal
      v-model:open="modalOpen"
      :item="editItem"
      @saved="refresh()"
    />
  </div>
</template>
