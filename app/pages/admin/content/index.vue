<script setup lang="ts">
import { ANNOUNCEMENT_LEVEL_META as levelMeta } from '#shared/types/message-level'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { parseFetchError } from '#shared/utils/clientError'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/useClientPagination'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

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
const confirm = useConfirmDialog()
const { settings, refresh: refreshSiteSettings } = useSiteSettings()

const showOnHome = ref(settings.value.announcement?.showOnHome ?? false)
const showOnHomeSaving = ref(false)

watch(() => settings.value.announcement?.showOnHome, (val) => {
  showOnHome.value = !!val
})

async function toggleShowOnHome(val: boolean) {
  const prev = showOnHome.value
  showOnHome.value = val
  showOnHomeSaving.value = true
  try {
    const res = await $fetch<{ public: PublicSiteSettings }>('/api/admin/settings/update', {
      method: 'PUT',
      body: { announcementShowOnHome: val }
    })
    const cached = useNuxtData<PublicSiteSettings>(PUBLIC_SITE_SETTINGS_KEY)
    if (cached.data.value) cached.data.value = res.public
    await refreshSiteSettings()
    toast.add({ title: val ? '已开启首页公告' : '已关闭首页公告', color: 'success' })
  } catch (err: unknown) {
    showOnHome.value = prev
    toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
  } finally {
    showOnHomeSaving.value = false
  }
}

const { data, status, refresh } = useLazyFetch<Announcement[]>('/api/admin/announcements/list', {
  default: () => []
})
const items = computed<Announcement[]>(() => data.value || [])
const { page, pageSize, total, paginated } = useClientPagination(items, 10)

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
    { label: '编辑', icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) }
  ]
}

function formatDate(iso: string | null) {
  return formatDateTime(iso)
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
    <UCard>
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex-1 min-w-[260px]">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-mdi-bullhorn-outline"
              class="size-5 text-muted"
            />
            <h3 class="font-semibold">
              首页公告弹窗
            </h3>
          </div>
          <p class="text-xs text-muted mt-2">
            开启后，访客首次进入网站首页会弹出当前生效的公告（最新一条默认展开，旧公告收起）。
            管理后台已通过顶部铃铛常驻入口展示公告，无需额外开关。
          </p>
        </div>
        <USwitch
          :model-value="showOnHome"
          :loading="showOnHomeSaving"
          :disabled="showOnHomeSaving"
          label="在网站首页弹出公告"
          @update:model-value="toggleShowOnHome"
        />
      </div>
    </UCard>

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

    <DashboardDataTable
      v-model:page="page"
      v-model:page-size="pageSize"
      :data="paginated"
      :columns="columns"
      :loading="status === 'pending'"
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
        <DashboardRowActions :items="getRowItems(row.original)" />
      </template>
    </DashboardDataTable>

    <AdminAnnouncementModal
      v-model:open="modalOpen"
      :item="editItem"
      @saved="refresh()"
    />
  </div>
</template>
