<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { parseFetchError } from '#shared/utils/clientError'

interface Announcement {
  id: number
  title: string
  content: string
  level: 'info' | 'success' | 'warning' | 'critical'
  isPinned: boolean
  isEnabled: boolean
  startAt: string | null
  endAt: string | null
  linkUrl: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const toast = useToast()

const { data, status, refresh } = useLazyFetch<Announcement[]>('/api/admin/announcements/list', {
  default: () => []
})
const items = computed<Announcement[]>(() => data.value || [])

const modalOpen = ref(false)
const editItem = ref<Announcement | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<Announcement | null>(null)
const deleteLoading = ref(false)

function openAdd() {
  editItem.value = null
  modalOpen.value = true
}
function openEdit(item: Announcement) {
  editItem.value = item
  modalOpen.value = true
}
function openDelete(item: Announcement) {
  deleteTarget.value = item
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch('/api/admin/announcements/delete', {
      method: 'POST',
      body: { id: deleteTarget.value.id }
    })
    toast.add({ title: '删除成功', color: 'success' })
    deleteOpen.value = false
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
  } finally {
    deleteLoading.value = false
  }
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
    { label: '编辑', icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) }
  ]
}

const levelMeta: Record<Announcement['level'], { color: 'info' | 'success' | 'warning' | 'error', label: string }> = {
  info: { color: 'info', label: '公告' },
  success: { color: 'success', label: '通知' },
  warning: { color: 'warning', label: '提醒' },
  critical: { color: 'error', label: '紧急' }
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}

const columns: TableColumn<Announcement>[] = [
  { accessorKey: 'title', header: '标题' },
  { id: 'window', header: '生效窗口' },
  { accessorKey: 'sortOrder', header: '排序' },
  { id: 'isEnabled', header: '启用' },
  { id: 'isPinned', header: '置顶' },
  { accessorKey: 'createdAt', header: '创建时间' },
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
        新建公告
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
      class="shrink-0"
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
      <template #window-cell="{ row }">
        <div class="text-xs text-muted">
          <div>开始：{{ formatDate(row.original.startAt) }}</div>
          <div>结束：{{ formatDate(row.original.endAt) }}</div>
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
        <span class="text-xs text-muted">{{ formatDate(row.original.createdAt) }}</span>
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

    <AdminAnnouncementModal
      v-model:open="modalOpen"
      :item="editItem"
      @saved="refresh()"
    />

    <AdminDeleteModal
      v-model:open="deleteOpen"
      :loading="deleteLoading"
      :title="`删除公告: ${deleteTarget?.title}`"
      description="删除后该公告不再展示，且不可恢复。"
      @confirm="confirmDelete"
    />
  </div>
</template>
