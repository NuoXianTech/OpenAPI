<script setup lang="ts">
import { ANNOUNCEMENT_LEVEL_META as levelMeta, MESSAGE_LEVELS, type Announcement, type MessageLevel } from '#shared/types/content'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { parseFetchError } from '~/utils/client-error'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

interface AnnouncementFilterOption<TValue extends string = string> {
  label: string
  value: TValue
}

type AnnouncementLevelFilter = 'all' | MessageLevel
type AnnouncementStatusFilter = 'all' | 'enabled' | 'disabled'
type AnnouncementPinnedFilter = 'all' | 'pinned' | 'normal'

const toast = useToast()
const confirm = useConfirmDialog()

const { data, loading, refresh } = usePrivateResource<Announcement[]>({
  path: '/api/admin/announcements/list',
  defaultData: () => []
})

const keyword = ref('')
const levelFilter = ref<AnnouncementLevelFilter>('all')
const statusFilter = ref<AnnouncementStatusFilter>('all')
const pinnedFilter = ref<AnnouncementPinnedFilter>('all')

const levelFilterOptions = computed<Array<AnnouncementFilterOption<AnnouncementLevelFilter>>>(() => [
  { label: '全部级别', value: 'all' },
  ...MESSAGE_LEVELS.map(level => ({
    label: levelMeta[level].label,
    value: level
  }))
])
const statusFilterOptions: Array<AnnouncementFilterOption<AnnouncementStatusFilter>> = [
  { label: '全部状态', value: 'all' },
  { label: '已启用', value: 'enabled' },
  { label: '已停用', value: 'disabled' }
]
const pinnedFilterOptions: Array<AnnouncementFilterOption<AnnouncementPinnedFilter>> = [
  { label: '全部置顶', value: 'all' },
  { label: '已置顶', value: 'pinned' },
  { label: '未置顶', value: 'normal' }
]
const activeFilterCount = computed(() => [
  levelFilter.value !== 'all',
  statusFilter.value !== 'all',
  pinnedFilter.value !== 'all'
].filter(Boolean).length)

const filteredData = computed(() => data.value.filter(item => isAnnouncementVisible(item)))
const { page, pageSize, total, paginated } = useClientPagination(filteredData, 10)

const modalOpen = ref(false)
const editItem = ref<Announcement | null>(null)

watch([keyword, levelFilter, statusFilter, pinnedFilter], () => {
  page.value = 1
})

function isAnnouncementVisible(item: Announcement): boolean {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  const matchesKeyword = !normalizedKeyword
    || item.title.toLowerCase().includes(normalizedKeyword)
    || item.content.toLowerCase().includes(normalizedKeyword)
    || (item.linkUrl || '').toLowerCase().includes(normalizedKeyword)
  const matchesLevel = levelFilter.value === 'all' || item.level === levelFilter.value
  const matchesStatus = statusFilter.value === 'all'
    || (statusFilter.value === 'enabled' && item.isEnabled)
    || (statusFilter.value === 'disabled' && !item.isEnabled)
  const matchesPinned = pinnedFilter.value === 'all'
    || (pinnedFilter.value === 'pinned' && item.isPinned)
    || (pinnedFilter.value === 'normal' && !item.isPinned)

  return matchesKeyword && matchesLevel && matchesStatus && matchesPinned
}

function resetFilters() {
  levelFilter.value = 'all'
  statusFilter.value = 'all'
  pinnedFilter.value = 'all'
}

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
    { label: '编辑', icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) }
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
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex items-center gap-2 flex-wrap">
        <UInput
          v-model="keyword"
          icon="i-mdi-magnify"
          placeholder="搜索标题、内容或链接"
          class="w-full sm:w-64"
        />
        <AdminFilterPopover
          :active-count="activeFilterCount"
          @reset="resetFilters"
        >
          <UFormField label="级别">
            <USelect
              v-model="levelFilter"
              :items="levelFilterOptions"
              class="w-full"
            />
          </UFormField>
          <UFormField label="状态">
            <USelect
              v-model="statusFilter"
              :items="statusFilterOptions"
              class="w-full"
            />
          </UFormField>
          <UFormField label="置顶">
            <USelect
              v-model="pinnedFilter"
              :items="pinnedFilterOptions"
              class="w-full"
            />
          </UFormField>
        </AdminFilterPopover>
      </div>
      <div class="ml-auto flex items-center gap-2 flex-wrap">
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
          :loading="loading"
          @click="refresh()"
        >
          刷新
        </UButton>
      </div>
    </div>

    <DashboardTableCard
      title="公告列表"
      icon="i-mdi-bullhorn-outline"
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
        empty-icon="i-mdi-bullhorn-outline"
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
      </DashboardDataTable>
    </DashboardTableCard>

    <AdminAnnouncementModal
      v-model:open="modalOpen"
      :item="editItem"
      @saved="refresh()"
    />
  </div>
</template>
