<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { FriendLinkItem } from '~/composables/link/types'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const toast = useToast()
const confirm = useConfirmDialog()

const { data, status, refresh } = useLazyFetch<FriendLinkItem[]>('/api/admin/friend-links/list', {
  default: () => []
})
const items = computed(() => data.value || [])

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
      :data="items"
      :columns="columns"
      :loading="status === 'pending'"
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

    <AdminLinkModal
      v-model:open="modalOpen"
      :item="editItem"
      @saved="refresh()"
    />
  </div>
</template>
