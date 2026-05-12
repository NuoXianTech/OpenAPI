<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

interface UserItem {
  id: number
  username: string
  email: string
  displayName: string | null
  isActive: boolean
  isBanned: boolean
}

interface MessageRow {
  id: number
  title: string
  level: 'info' | 'success' | 'warning' | 'critical'
  audience: 'specific' | 'all_current' | 'all_with_future'
  recipientCount: number
  senderActor: string | null
  createdAt: string
  deliveredCount: number
  readCount: number
}

const toast = useToast()

const { data: usersData } = useLazyFetch<UserItem[]>('/api/admin/users/list', {
  default: () => [],
})
const users = computed(() => (usersData.value || []).filter(u => !u.isBanned))

const { data: messagesData, status, refresh } = useLazyFetch<MessageRow[]>('/api/admin/notifications/list', {
  default: () => [],
})
const messages = computed<MessageRow[]>(() => messagesData.value || [])

// ----- 撰写表单 -----
const form = reactive({
  audience: 'specific' as MessageRow['audience'],
  recipientUserIds: [] as number[],
  title: '',
  content: '',
  level: 'info' as 'info' | 'success' | 'warning' | 'critical',
  linkUrl: '',
})
const sending = ref(false)

const userOptions = computed(() => users.value.map(u => ({
  label: `${u.username}${u.email ? ` <${u.email}>` : ''}`,
  value: u.id,
})))

const audienceOptions = [
  { label: '指定用户（仅选中收件人）', value: 'specific' },
  { label: '当前所有用户（不含未来注册）', value: 'all_current' },
  { label: '当前及未来注册用户（新用户激活时自动补发）', value: 'all_with_future' },
]

const levelOptions = [
  { label: '通知 (info)', value: 'info' },
  { label: '成功 (success)', value: 'success' },
  { label: '提醒 (warning)', value: 'warning' },
  { label: '紧急 (critical)', value: 'critical' },
]

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
        linkUrl: form.linkUrl.trim() || null,
      },
    })
    toast.add({ title: `已发送（投递 ${res?.deliveredCount ?? 0} 人）`, color: 'success' })
    form.title = ''
    form.content = ''
    form.linkUrl = ''
    form.recipientUserIds = []
    form.audience = 'specific'
    await refresh()
  }
  catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '发送失败', color: 'error' })
  }
  finally {
    sending.value = false
  }
}

// ----- 详情 -----
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailMessage = ref<MessageRow | null>(null)
const detailRows = ref<Array<{ id: number, recipientUserId: number, recipientUsername: string | null, isRead: boolean, readAt: string | null, createdAt: string }>>([])

async function openDetail(row: MessageRow) {
  detailMessage.value = row
  detailOpen.value = true
  detailLoading.value = true
  try {
    const res = await $fetch<{ deliveries?: typeof detailRows.value }>('/api/admin/notifications/detail', { query: { messageId: row.id } })
    detailRows.value = res?.deliveries || []
  }
  finally {
    detailLoading.value = false
  }
}

// ----- 删除 -----
const deleteOpen = ref(false)
const deleteTarget = ref<MessageRow | null>(null)
const deleteLoading = ref(false)

function openDelete(row: MessageRow) {
  deleteTarget.value = row
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch('/api/admin/notifications/delete', {
      method: 'POST',
      body: { messageId: deleteTarget.value.id },
    })
    toast.add({ title: '已删除', color: 'success' })
    deleteOpen.value = false
    await refresh()
  }
  catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '删除失败', color: 'error' })
  }
  finally {
    deleteLoading.value = false
  }
}

// ----- 渲染辅助 -----
const levelMeta: Record<MessageRow['level'], { color: 'info' | 'success' | 'warning' | 'error', label: string }> = {
  info: { color: 'info', label: '通知' },
  success: { color: 'success', label: '成功' },
  warning: { color: 'warning', label: '提醒' },
  critical: { color: 'error', label: '紧急' },
}

const audienceMeta: Record<MessageRow['audience'], { color: 'neutral' | 'info' | 'warning', label: string }> = {
  specific: { color: 'neutral', label: '指定' },
  all_current: { color: 'info', label: '全员' },
  all_with_future: { color: 'warning', label: '全员+未来' },
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  }
  catch {
    return iso
  }
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

function getRowItems(row: MessageRow): DropdownMenuItem[] {
  return [
    { label: '查看接收详情', icon: 'i-mdi-account-multiple-outline', onSelect: () => openDetail(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) },
  ]
}

const columns: TableColumn<MessageRow>[] = [
  {
    accessorKey: 'title',
    header: '标题',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
      h(UBadge, {
        color: levelMeta[row.original.level].color,
        variant: 'subtle',
        size: 'sm',
      }, () => levelMeta[row.original.level].label),
      h(UBadge, {
        color: audienceMeta[row.original.audience].color,
        variant: 'soft',
        size: 'sm',
      }, () => audienceMeta[row.original.audience].label),
      h('span', { class: 'font-medium truncate max-w-[260px]' }, row.original.title),
    ]),
  },
  {
    id: 'delivery',
    header: '投递 / 已读',
    cell: ({ row }) => h('div', { class: 'flex flex-col text-xs' }, [
      h('span', { class: 'tabular-nums' }, `投递 ${row.original.deliveredCount} 人`),
      h('span', { class: 'text-muted tabular-nums' }, `已读 ${row.original.readCount} 人`),
    ]),
  },
  { accessorKey: 'senderActor', header: '发送人' },
  {
    accessorKey: 'createdAt',
    header: '发送时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted' }, formatDate(row.original.createdAt)),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, {
      items: getRowItems(row.original),
      content: { align: 'end' },
    }, () => h(UButton, {
      icon: 'i-mdi-dots-vertical',
      color: 'neutral',
      variant: 'ghost',
      size: 'sm',
    }))),
  },
]
</script>

<template>
  <UDashboardPanel id="admin-notifications">
    <template #header>
      <UDashboardNavbar title="通知管理">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions
            :on-refresh="refresh"
            :refreshing="status === 'pending'"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- 撰写 -->
        <UCard class="shadow-sm">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-email-edit-outline"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
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
                icon="i-mdi-send"
                :loading="sending"
                @click="submitSend"
              >
                发送
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- 历史 -->
        <UCard class="shadow-sm">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-history"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                发送历史
              </h3>
              <span class="ml-auto text-xs text-muted">
                用户的"已读"或个人删除不会影响此处历史
              </span>
            </div>
          </template>
          <UTable
            :data="messages"
            :columns="columns"
            :loading="status === 'pending'"
            :ui="{
              base: 'table-fixed',
              th: 'py-2',
              td: 'py-2 align-top',
            }"
          />
        </UCard>
      </div>

      <!-- 详情 modal -->
      <UModal
        v-model:open="detailOpen"
        :ui="{ content: 'sm:max-w-2xl' }"
      >
        <template #content>
          <div class="p-6 max-h-[80vh] overflow-y-auto">
            <h3 class="text-lg font-semibold mb-1">
              接收详情
            </h3>
            <p
              v-if="detailMessage"
              class="text-xs text-muted mb-4"
            >
              {{ detailMessage.title }} · {{ formatDate(detailMessage.createdAt) }} ·
              范围 {{ audienceMeta[detailMessage.audience].label }} ·
              已投递 {{ detailMessage.deliveredCount }} / 已读 {{ detailMessage.readCount }}
            </p>
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
                  {{ r.isRead ? `已读 · ${formatDate(r.readAt)}` : '未读' }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </UModal>

      <!-- 删除确认 -->
      <AdminDeleteModal
        v-model:open="deleteOpen"
        :loading="deleteLoading"
        :title="`删除通知: ${deleteTarget?.title || ''}`"
        description="软删除后，所有收件人将不再看到此条通知；发送历史不可恢复。"
        @confirm="confirmDelete"
      />
    </template>
  </UDashboardPanel>
</template>
