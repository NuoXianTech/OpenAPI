<script setup lang="ts">
import { MESSAGE_LEVELS, NOTIFICATION_LEVEL_META as levelMeta, type MessageLevel } from '#shared/types/content'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import {
  useAdminNotificationsDisplayMeta,
  type AdminNotificationDeliveryRow,
  type AdminNotificationMessageRow,
  type AdminNotificationUserItem
} from '~/composables/admin/use-admin-display-meta'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

interface AdminNotificationFilterOption<TValue extends string = string> {
  label: string
  value: TValue
}

type AdminNotificationAudienceFilter = 'all' | AdminNotificationMessageRow['audience']
type AdminNotificationLevelFilter = 'all' | MessageLevel

const toast = useToast()

const { data: usersData } = usePrivateResource<AdminNotificationUserItem[]>({
  path: '/api/admin/users/list',
  defaultData: () => []
})

const { data: messagesData, loading, refresh } = usePrivateResource<AdminNotificationMessageRow[]>({
  path: '/api/admin/notifications/list',
  defaultData: () => []
})

const historyKeyword = ref('')
const historyAudienceFilter = ref<AdminNotificationAudienceFilter>('all')
const historyLevelFilter = ref<AdminNotificationLevelFilter>('all')

const sendModalOpen = ref(false)

function openSendModal(): void {
  sendModalOpen.value = true
}

const {
  audienceMeta,
  columns,
  getRowItems
} = useAdminNotificationsDisplayMeta({
  users: usersData,
  openDetail,
  openDelete
})

const historyAudienceFilterOptions = computed<Array<AdminNotificationFilterOption<AdminNotificationAudienceFilter>>>(() => [
  { label: '全部范围', value: 'all' },
  { label: audienceMeta.specific.label, value: 'specific' },
  { label: audienceMeta.all_current.label, value: 'all_current' },
  { label: audienceMeta.all_with_future.label, value: 'all_with_future' }
])
const historyLevelFilterOptions = computed<Array<AdminNotificationFilterOption<AdminNotificationLevelFilter>>>(() => [
  { label: '全部级别', value: 'all' },
  ...MESSAGE_LEVELS.map(level => ({
    label: levelMeta[level].label,
    value: level
  }))
])
const activeHistoryFilterCount = computed(() => [
  historyAudienceFilter.value !== 'all',
  historyLevelFilter.value !== 'all'
].filter(Boolean).length)
const filteredMessagesData = computed(() => messagesData.value.filter(row => isNotificationMessageVisible(row)))
const { page, pageSize, total, paginated } = useClientPagination(filteredMessagesData, 10)

watch([historyKeyword, historyAudienceFilter, historyLevelFilter], () => {
  page.value = 1
})

function isNotificationMessageVisible(row: AdminNotificationMessageRow): boolean {
  const normalizedKeyword = historyKeyword.value.trim().toLowerCase()
  const matchesKeyword = !normalizedKeyword
    || row.title.toLowerCase().includes(normalizedKeyword)
    || (row.senderActor || '').toLowerCase().includes(normalizedKeyword)
  const matchesAudience = historyAudienceFilter.value === 'all' || row.audience === historyAudienceFilter.value
  const matchesLevel = historyLevelFilter.value === 'all' || row.level === historyLevelFilter.value

  return matchesKeyword && matchesAudience && matchesLevel
}

function resetHistoryFilters() {
  historyAudienceFilter.value = 'all'
  historyLevelFilter.value = 'all'
}

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailMessage = ref<AdminNotificationMessageRow | null>(null)
const detailRows = ref<AdminNotificationDeliveryRow[]>([])

async function openDetail(row: AdminNotificationMessageRow) {
  detailMessage.value = row
  detailOpen.value = true
  detailLoading.value = true
  detailRows.value = []
  try {
    const res = await $fetch<{ deliveries?: typeof detailRows.value }>('/api/admin/notifications/detail', { query: { messageId: row.id } })
    detailRows.value = res?.deliveries || []
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '加载接收详情失败'), color: 'error' })
  } finally {
    detailLoading.value = false
  }
}

const confirm = useConfirmDialog()

async function openDelete(row: AdminNotificationMessageRow) {
  await confirm({
    title: `删除通知: ${row.title || ''}`,
    description: '软删除后，所有收件人将不再看到此条通知；发送历史不可恢复。',
    onConfirm: async () => {
      try {
        await $fetch('/api/admin/notifications/delete', {
          method: 'POST',
          body: { messageId: row.id }
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
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex items-center gap-2 flex-wrap">
        <UInput
          v-model="historyKeyword"
          icon="i-mdi-magnify"
          placeholder="搜索发送历史标题或发送人"
          class="w-full sm:w-72"
        />
        <AdminFilterPopover
          :active-count="activeHistoryFilterCount"
          @reset="resetHistoryFilters"
        >
          <UFormField label="范围">
            <USelect
              v-model="historyAudienceFilter"
              :items="historyAudienceFilterOptions"
              class="w-full"
            />
          </UFormField>
          <UFormField label="级别">
            <USelect
              v-model="historyLevelFilter"
              :items="historyLevelFilterOptions"
              class="w-full"
            />
          </UFormField>
        </AdminFilterPopover>
      </div>
      <div class="ml-auto flex items-center gap-2 flex-wrap">
        <UButton
          icon="i-mdi-send"
          @click="openSendModal"
        >
          发送通知
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
      title="发送历史"
      icon="i-mdi-history"
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
        empty-title="暂无发送历史"
        empty-icon="i-mdi-history"
      >
        <template #title-cell="{ row }">
          <div class="flex items-center gap-2">
            <UBadge
              :color="levelMeta[row.original.level].color"
              variant="subtle"
              size="sm"
            >
              {{ levelMeta[row.original.level].label }}
            </UBadge>
            <UBadge
              :color="audienceMeta[row.original.audience].color"
              variant="soft"
              size="sm"
            >
              {{ audienceMeta[row.original.audience].label }}
            </UBadge>
            <span class="font-medium truncate max-w-[260px]">{{ row.original.title }}</span>
          </div>
        </template>
        <template #delivery-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span class="tabular-nums">投递 {{ row.original.deliveredCount }} 人</span>
            <span class="text-muted tabular-nums">已读 {{ row.original.readCount }} 人</span>
          </div>
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

    <AdminNotificationSendModal
      v-model:open="sendModalOpen"
      :users="usersData"
      @sent="refresh()"
    />

    <UModal
      v-model:open="detailOpen"
      title="接收详情"
      :description="detailMessage ? `${detailMessage.title} · ${formatDateTime(detailMessage.createdAt)} · 范围 ${audienceMeta[detailMessage.audience].label} · 已投递 ${detailMessage.deliveredCount} / 已读 ${detailMessage.readCount}` : undefined"
      :ui="adminModalUi({ content: 'sm:max-w-2xl' })"
    >
      <template #body>
        <div
          v-if="detailLoading"
          class="text-center text-sm text-muted py-8"
        >
          加载中...
        </div>
        <div
          v-else-if="detailRows.length === 0"
          class="text-center text-sm text-muted py-8"
        >
          暂无投递记录
        </div>
        <div
          v-else
          class="divide-y divide-default"
        >
          <div
            v-for="r in detailRows"
            :key="r.id"
            class="flex items-center gap-3 py-2 text-sm"
          >
            <UIcon
              :name="r.isRead ? 'i-mdi-email-open-outline' : 'i-mdi-email-outline'"
              :class="r.isRead ? 'text-success' : 'text-muted'"
              class="size-4"
            />
            <span class="flex-1 font-medium">
              {{ r.recipientUsername || `#${r.recipientUserId}` }}
            </span>
            <span class="text-xs text-muted">
              {{ r.isRead ? `已读 · ${formatDateTime(r.readAt)}` : '未读' }}
            </span>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
