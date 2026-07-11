<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { FriendLinkItem } from '#shared/types/content'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

interface FriendLinkFilterOption<TValue extends string = string> {
  label: string
  value: TValue
}

type FriendLinkStatusFilter = 'all' | 'active' | 'inactive'

const toast = useToast()
const confirm = useConfirmDialog()

const { data, loading, refresh } = usePrivateResource<FriendLinkItem[]>({
  path: '/api/admin/friend-links/list',
  defaultData: () => []
})

const keyword = ref('')
const statusFilter = ref<FriendLinkStatusFilter>('all')
const statusFilterOptions: Array<FriendLinkFilterOption<FriendLinkStatusFilter>> = [
  { label: '全部状态', value: 'all' },
  { label: '正常', value: 'active' },
  { label: '停用', value: 'inactive' }
]
const activeFilterCount = computed(() => [
  statusFilter.value !== 'all'
].filter(Boolean).length)

const filteredData = computed(() => data.value.filter(item => isFriendLinkVisible(item)))
const { page, pageSize, total, paginated } = useClientPagination(filteredData, 10)

const modalOpen = ref(false)
const editItem = ref<FriendLinkItem | null>(null)

watch([keyword, statusFilter], () => {
  page.value = 1
})

function isFriendLinkVisible(item: FriendLinkItem): boolean {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  const matchesKeyword = !normalizedKeyword
    || item.title.toLowerCase().includes(normalizedKeyword)
    || item.url.toLowerCase().includes(normalizedKeyword)
    || (item.description || '').toLowerCase().includes(normalizedKeyword)
  const matchesStatus = statusFilter.value === 'all'
    || (statusFilter.value === 'active' && item.isActive)
    || (statusFilter.value === 'inactive' && !item.isActive)

  return matchesKeyword && matchesStatus
}

function resetFilters() {
  statusFilter.value = 'all'
}

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
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex items-center gap-2 flex-wrap">
        <UInput
          v-model="keyword"
          icon="i-mdi-magnify"
          placeholder="搜索名称、URL 或描述"
          class="w-full sm:w-72"
        />
        <AdminFilterPopover
          :active-count="activeFilterCount"
          @reset="resetFilters"
        >
          <UFormField label="状态">
            <USelect
              v-model="statusFilter"
              :items="statusFilterOptions"
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

    <LazyAdminLinkModal
      v-if="modalOpen"
      v-model:open="modalOpen"
      :item="editItem"
      @saved="refresh()"
    />
  </div>
</template>
