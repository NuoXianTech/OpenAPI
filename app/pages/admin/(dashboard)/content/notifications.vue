<script setup lang="ts">
import { NOTIFICATION_LEVEL_META as levelMeta } from '#shared/types/message-level'
import { parseFetchError } from '#shared/utils/client-error'
import {
  createAdminNotificationForm,
  useAdminNotificationsDisplayMeta,
  type AdminNotificationDeliveryRow,
  type AdminNotificationMessageRow,
  type AdminNotificationUserItem
} from '~/composables/admin/use-admin-display-meta'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

const toast = useToast()

const { data: usersData } = usePrivateResource<AdminNotificationUserItem[]>({
  path: '/api/admin/users/list',
  defaultData: () => []
})

const { data: messagesData, loading, refresh } = usePrivateResource<AdminNotificationMessageRow[]>({
  path: '/api/admin/notifications/list',
  defaultData: () => []
})
const { page, pageSize, total, paginated } = useClientPagination(messagesData, 10)

const form = reactive(createAdminNotificationForm())
const sending = ref(false)

const {
  userOptions,
  audienceOptions,
  levelOptions,
  audienceMeta,
  columns,
  getRowItems
} = useAdminNotificationsDisplayMeta({
  users: usersData,
  openDetail,
  openDelete
})

async function submitSend() {
  if (!form.title.trim() || !form.content.trim()) {
    toast.add({ title: '标题和内容必填', color: 'warning' })
    return
  }
  if (form.audience === 'specific' && form.recipientUserIds.length === 0) {
    toast.add({ title: '请选择收件人或改为全员发送', color: 'warning' })
    return
  }
  sending.value = true
  try {
    const res = await $fetch<{ deliveredCount?: number }>('/api/admin/notifications/send', {
      method: 'POST',
      body: {
        audience: form.audience,
        recipientUserIds: form.audience === 'specific' ? form.recipientUserIds : [],
        title: form.title.trim(),
        content: form.content,
        level: form.level,
        linkUrl: form.linkUrl.trim() || null
      }
    })
    toast.add({ title: `已发送（投递 ${res?.deliveredCount ?? 0} 人）`, color: 'success' })
    form.title = ''
    form.content = ''
    form.linkUrl = ''
    form.recipientUserIds = []
    form.audience = 'specific'
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '发送失败'), color: 'error' })
  } finally {
    sending.value = false
  }
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
    <div class="flex items-center justify-end">
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

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-mail-plus"
              class="size-5 text-muted"
            />
            <h3 class="text-lg font-semibold text-highlighted">
              发送新通知
            </h3>
          </div>
        </template>
        <div class="space-y-4">
          <UFormField label="发送范围">
            <USelect
              v-model="form.audience"
              :items="audienceOptions"
            />
            <p
              v-if="form.audience === 'all_with_future'"
              class="text-xs text-muted mt-1.5"
            >
              选择此项后，新注册用户首次激活时将自动补发本条通知。
            </p>
          </UFormField>

          <UFormField
            v-if="form.audience === 'specific'"
            label="收件人（可多选）"
          >
            <USelectMenu
              v-model="form.recipientUserIds"
              :items="userOptions"
              multiple
              searchable
              value-key="value"
              placeholder="搜索用户名/邮箱..."
            />
          </UFormField>

          <div class="grid grid-cols-3 gap-3">
            <UFormField
              label="标题"
              class="col-span-2"
            >
              <UInput
                v-model="form.title"
                placeholder="最多 200 字"
              />
            </UFormField>
            <UFormField label="级别">
              <USelect
                v-model="form.level"
                :items="levelOptions"
              />
            </UFormField>
          </div>

          <UFormField label="内容">
            <UTextarea
              v-model="form.content"
              :rows="6"
              placeholder="支持纯文本，换行将保留"
              class="w-full sm:max-w-lg"
            />
          </UFormField>

          <UFormField label="附加链接（可选）">
            <UInput
              v-model="form.linkUrl"
              placeholder="https://example.com/post/xx"
            />
          </UFormField>

          <div class="flex justify-end">
            <UButton
              icon="i-lucide-send"
              :loading="sending"
              @click="submitSend"
            >
              发送
            </UButton>
          </div>
        </div>
      </UCard>

      <DashboardTableCard
        title="发送历史"
        icon="i-lucide-history"
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
          empty-icon="i-lucide-history"
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
            <DashboardRowActions :items="getRowItems(row.original)" />
          </template>
        </DashboardDataTable>
      </DashboardTableCard>
    </div>

    <UModal
      v-model:open="detailOpen"
      title="接收详情"
      :description="detailMessage ? `${detailMessage.title} · ${formatDateTime(detailMessage.createdAt)} · 范围 ${audienceMeta[detailMessage.audience].label} · 已投递 ${detailMessage.deliveredCount} / 已读 ${detailMessage.readCount}` : undefined"
      :ui="{ content: 'sm:max-w-2xl' }"
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
              :name="r.isRead ? 'i-lucide-mail-open' : 'i-lucide-mail'"
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
