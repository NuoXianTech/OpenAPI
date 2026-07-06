<script setup lang="ts">
import { ANNOUNCEMENT_LEVEL_META as levelMeta } from '#shared/types/message-level'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { parseFetchError } from '~/utils/client-error'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

interface Announcement {
  id: number
  title: string
  content: string
  level: 'info' | 'success' | 'warning' | 'critical'
  isPinned: boolean
  isEnabled: boolean
  linkUrl: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const toast = useToast()
const confirm = useConfirmDialog()

const { data, loading, refresh } = usePrivateResource<Announcement[]>({
  path: '/api/admin/announcements/list',
  defaultData: () => []
})
const { page, pageSize, total, paginated } = useClientPagination(data, 10)

const modalOpen = ref(false)
const editItem = ref<Announcement | null>(null)

function openAdd() {
  editItem.value = null
  modalOpen.value = true
}
function openEdit(item: Announcement) {
  editItem.value = item
  modalOpen.value = true
}
async function openDelete(item: Announcement) {
  await confirm({
    title: `删除公告: ${item.title}`,
    description: '删除后该公告不再展示，且不可恢复。',
    onConfirm: async () => {
      try {
        await $fetch('/api/admin/announcements/delete', {
          method: 'POST',
          body: { id: item.id }
        })
        toast.add({ title: '删除成功', color: 'success' })
        await refresh()
      } catch (err: unknown) {
        toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
        throw err
      }
    }
  })
}

async function quickToggle(row: Announcement, field: 'isEnabled' | 'isPinned', value: boolean) {
  try {
    await $fetch('/api/admin/announcements/update', {
      method: 'PUT',
      body: { id: row.id, [field]: value }
    })
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
  }
}

function getRowItems(row: Announcement): DropdownMenuItem[] {
  return [
    { label: '编辑', icon: 'i-lucide-pencil', onSelect: () => openEdit(row) },
    { label: '删除', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => openDelete(row) }
  ]
}

const columns: TableColumn<Announcement>[] = [
  { accessorKey: 'title', header: '标题' },
  { accessorKey: 'sortOrder', header: '排序' },
  { id: 'isEnabled', header: '启用' },
  { id: 'isPinned', header: '置顶' },
  { accessorKey: 'createdAt', header: '创建时间' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-end gap-2">
      <UButton
        icon="i-lucide-plus"
        @click="openAdd"
      >
        新建公告
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-refresh-cw"
        :loading="loading"
        @click="refresh()"
      >
        刷新
      </UButton>
    </div>

    <DashboardTableCard
      title="公告列表"
      icon="i-lucide-megaphone"
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
        empty-title="暂无公告"
        empty-icon="i-lucide-megaphone"
      >
        <template #title-cell="{ row }">
          <div class="flex items-center gap-2">
            <UBadge
              :color="levelMeta[row.original.level].color"
              variant="subtle"
            >
              {{ levelMeta[row.original.level].label }}
            </UBadge>
            <span class="font-medium truncate max-w-[300px]">{{ row.original.title }}</span>
            <UBadge
              v-if="row.original.isPinned"
              color="warning"
              variant="soft"
            >
              置顶
            </UBadge>
          </div>
        </template>
        <template #isEnabled-cell="{ row }">
          <USwitch
            :model-value="row.original.isEnabled"
            @update:model-value="(val: boolean) => quickToggle(row.original, 'isEnabled', val)"
          />
        </template>
        <template #isPinned-cell="{ row }">
          <USwitch
            :model-value="row.original.isPinned"
            @update:model-value="(val: boolean) => quickToggle(row.original, 'isPinned', val)"
          />
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted">{{ formatDateTime(row.original.createdAt) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <DashboardRowActions :items="getRowItems(row.original)" />
        </template>
      </DashboardDataTable>
    </DashboardTableCard>

    <AdminAnnouncementModal
      v-model:open="modalOpen"
      :item="editItem"
      @saved="refresh()"
    />
  </div>
</template>
