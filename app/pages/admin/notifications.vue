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
  deletedAt: string | null
}

interface BatchRow {
  batchId: string | null
  title: string
  level: 'info' | 'success' | 'warning' | 'critical'
  senderActor: string | null
  createdAt: string
  total: number
}

const toast = useToast()

const { data: usersData } = await useFetch('/api/admin/users/list', {
  default: () => ({ code: 0, msg: '', data: [] as UserItem[] }),
})
const users = computed(() => (usersData.value?.data || []).filter(u => !u.deletedAt && !u.isBanned))

const { data: batchesData, status, refresh } = await useFetch('/api/admin/notifications/list', {
  default: () => ({ code: 0, msg: '', data: [] as BatchRow[] }),
})
const batches = computed<BatchRow[]>(() => batchesData.value?.data || [])

// ----- 撰写表单 -----
const form = reactive({
  broadcast: false,
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
  if (!form.broadcast && form.recipientUserIds.length === 0) {
    toast.add({ title: '请选择收件人或开启广播', color: 'warning' })
    return
  }
  sending.value = true
  try {
    const res: any = await $fetch('/api/admin/notifications/send', {
      method: 'POST',
      body: {
        broadcast: form.broadcast,
        recipientUserIds: form.broadcast ? [] : form.recipientUserIds,
        title: form.title.trim(),
        content: form.content,
        level: form.level,
        linkUrl: form.linkUrl.trim() || null,
      },
    })
    toast.add({ title: `已发送至 ${res?.data?.inserted ?? 0} 位用户`, color: 'success' })
    form.title = ''
    form.content = ''
    form.linkUrl = ''
    form.recipientUserIds = []
    form.broadcast = false
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '发送失败', color: 'error' })
  }
  finally {
    sending.value = false
  }
}

// ----- 批次详情 -----
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailRows = ref<Array<{ id: number, recipientUserId: number, recipientUsername: string | null, isRead: boolean, readAt: string | null, createdAt: string }>>([])
const detailBatch = ref<BatchRow | null>(null)

async function openDetail(row: BatchRow) {
  if (!row.batchId) return
  detailBatch.value = row
  detailOpen.value = true
  detailLoading.value = true
  try {
    const res: any = await $fetch('/api/admin/notifications/detail', { query: { batchId: row.batchId } })
    detailRows.value = res?.data || []
  }
  finally {
    detailLoading.value = false
  }
}

const levelMeta: Record<BatchRow['level'], { color: 'info' | 'success' | 'warning' | 'error', label: string }> = {
  info: { color: 'info', label: '通知' },
  success: { color: 'success', label: '成功' },
  warning: { color: 'warning', label: '提醒' },
  critical: { color: 'error', label: '紧急' },
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('zh-CN', { hour12: false }) }
  catch { return iso }
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

function getRowItems(row: BatchRow): DropdownMenuItem[] {
  return [
    { label: '查看接收详情', icon: 'i-mdi-account-multiple-outline', onSelect: () => openDetail(row), disabled: !row.batchId },
  ]
}

const columns: TableColumn<BatchRow>[] = [
  {
    accessorKey: 'title',
    header: '标题 / 级别',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
      h(UBadge, {
        color: levelMeta[row.original.level].color,
        variant: 'subtle',
        size: 'sm',
      }, () => levelMeta[row.original.level].label),
      h('span', { class: 'font-medium truncate max-w-[320px]' }, row.original.title),
    ]),
  },
  {
    accessorKey: 'total',
    header: '收件人数',
    cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, String(row.original.total)),
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
      <UDashboardNavbar title="通知中心">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-mdi-refresh"
            color="neutral"
            variant="outline"
            :loading="status === 'pending'"
            @click="refresh()"
          >
            刷新
          </UButton>
          <AdminHeaderUser />
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
            <div class="flex items-center gap-2">
              <USwitch
                v-model="form.broadcast"
                label="广播给所有未删除/未封禁用户"
              />
            </div>
            <UFormField
              v-if="!form.broadcast"
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

        <!-- 历史批次 -->
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
            </div>
          </template>
          <UTable
            :data="batches"
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

      <UModal
        v-model:open="detailOpen"
        :ui="{ content: 'sm:max-w-2xl' }"
      >
        <template #content>
          <div class="p-6 max-h-[80vh] overflow-y-auto">
            <h3 class="text-lg font-semibold mb-1">
              批次详情
            </h3>
            <p
              v-if="detailBatch"
              class="text-xs text-muted mb-4"
            >
              {{ detailBatch.title }} · {{ formatDate(detailBatch.createdAt) }} · 共 {{ detailBatch.total }} 位收件人
            </p>
            <div
              v-if="detailLoading"
              class="text-center text-sm text-muted py-8"
            >
              加载中...
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
    </template>
  </UDashboardPanel>
</template>
