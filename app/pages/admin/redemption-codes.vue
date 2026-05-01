<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const toast = useToast()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

interface RedemptionCode {
  id: number
  code: string
  amount: number
  batchId: string | null
  note: string | null
  maxUses: number
  usedCount: number
  expiresAt: string | null
  isEnabled: boolean
  createdAt: string
}

interface ListResp { code: number, msg: string, data: { items: RedemptionCode[], total: number } }
interface BatchSummary {
  batchId: string
  note: string | null
  amount: number
  total: number
  usedTotal: number
  maxUsesTotal: number
  createdAt: string
}
interface BatchesResp { code: number, msg: string, data: BatchSummary[] }

const filters = reactive({
  status: 'all' as 'all' | 'enabled' | 'disabled' | 'used_up' | 'expired' | 'available',
  batchId: 'all' as string,
  keyword: '',
})
const page = ref(1)
const pageSize = ref(50)

const items = ref<RedemptionCode[]>([])
const total = ref(0)
const loading = ref(false)

const batches = ref<BatchSummary[]>([])

async function fetchBatches() {
  try {
    const res = await $fetch<BatchesResp>('/api/admin/redemption-codes/batches')
    batches.value = res?.data || []
  }
  catch (err) {
    console.error('failed to load batches', err)
  }
}

async function fetchList() {
  loading.value = true
  try {
    const res = await $fetch<ListResp>('/api/admin/redemption-codes/list', {
      query: {
        status: filters.status === 'all' ? undefined : filters.status,
        batchId: filters.batchId === 'all' ? undefined : filters.batchId,
        keyword: filters.keyword || undefined,
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value,
      },
    })
    items.value = res?.data?.items || []
    total.value = res?.data?.total || 0
  }
  catch (err) {
    console.error('failed to load codes', err)
    items.value = []
    total.value = 0
  }
  finally {
    loading.value = false
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
watch(page, () => { void fetchList() })

onMounted(async () => {
  await Promise.all([fetchBatches(), fetchList()])
})

function applyFilters() { page.value = 1; void fetchList() }
function resetFilters() {
  filters.status = 'all'
  filters.batchId = 'all'
  filters.keyword = ''
  page.value = 1
  void fetchList()
}

// ----- 生成弹窗 -----
const generateOpen = ref(false)
const generating = ref(false)
const generateForm = reactive({
  amount: 100,
  count: 1,
  prefix: '',
  length: 16,
  maxUses: 1,
  expiresInDays: 0, // 0 = 永不过期
  note: '',
})

const generatedResult = ref<{ batchId: string, codes: Array<{ id: number, code: string }>, generated: number, requested: number } | null>(null)

function openGenerate() {
  Object.assign(generateForm, {
    amount: 100, count: 1, prefix: '', length: 16, maxUses: 1, expiresInDays: 0, note: '',
  })
  generatedResult.value = null
  generateOpen.value = true
}

async function submitGenerate() {
  if (!Number.isFinite(generateForm.amount) || generateForm.amount <= 0) {
    toast.add({ title: 'amount 必须 > 0', color: 'warning' })
    return
  }
  generating.value = true
  try {
    let expiresAt: string | null = null
    if (generateForm.expiresInDays > 0) {
      const d = new Date()
      d.setDate(d.getDate() + Math.trunc(generateForm.expiresInDays))
      expiresAt = d.toISOString()
    }
    const res = await $fetch<{ data: { batchId: string, generated: number, requested: number, codes: Array<{ id: number, code: string }> } }>('/api/admin/redemption-codes/generate', {
      method: 'POST',
      body: {
        amount: Math.trunc(generateForm.amount),
        count: Math.trunc(generateForm.count),
        prefix: generateForm.prefix.trim() || null,
        length: Math.trunc(generateForm.length),
        maxUses: Math.trunc(generateForm.maxUses),
        expiresAt,
        note: generateForm.note.trim() || null,
      },
    })
    generatedResult.value = res.data
    toast.add({ title: `已生成 ${res.data.generated} 张兑换码`, color: 'success' })
    await Promise.all([fetchBatches(), fetchList()])
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '生成失败', color: 'error' })
  }
  finally {
    generating.value = false
  }
}

function copyAllCodes() {
  if (!generatedResult.value) return
  const text = generatedResult.value.codes.map(c => c.code).join('\n')
  navigator.clipboard.writeText(text).then(() => {
    toast.add({ title: '已复制全部兑换码到剪贴板', color: 'success' })
  })
}

function copyOne(code: string) {
  navigator.clipboard.writeText(code).then(() => {
    toast.add({ title: `已复制 ${code}`, color: 'success' })
  })
}

// ----- 行操作 -----
async function toggle(item: RedemptionCode) {
  try {
    await $fetch('/api/admin/redemption-codes/toggle', {
      method: 'POST',
      body: { id: item.id, enabled: !item.isEnabled },
    })
    toast.add({ title: item.isEnabled ? '已禁用' : '已启用', color: 'success' })
    await fetchList()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  }
}

async function remove(item: RedemptionCode) {
  if (!confirm(`确认删除兑换码 ${item.code}？`)) return
  try {
    await $fetch('/api/admin/redemption-codes/delete', {
      method: 'POST',
      body: { id: item.id },
    })
    toast.add({ title: '已删除', color: 'success' })
    await fetchList()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  }
}

// ----- 批次操作 -----
async function toggleBatch(batchId: string, enabled: boolean) {
  try {
    const res = await $fetch<{ data: { affected: number } }>('/api/admin/redemption-codes/toggle', {
      method: 'POST',
      body: { batchId, enabled },
    })
    toast.add({ title: `已${enabled ? '启用' : '禁用'} ${res.data.affected} 张兑换码`, color: 'success' })
    await Promise.all([fetchBatches(), fetchList()])
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  }
}

async function deleteBatch(batchId: string, includeUsed: boolean) {
  const msg = includeUsed
    ? `确认删除批次 ${batchId} 的全部兑换码（含已被兑换过的）？此操作不可恢复。`
    : `确认删除批次 ${batchId} 中未被使用过的兑换码？`
  if (!confirm(msg)) return
  try {
    const res = await $fetch<{ data: { affected: number } }>('/api/admin/redemption-codes/delete', {
      method: 'POST',
      body: { batchId, includeUsed },
    })
    toast.add({ title: `已删除 ${res.data.affected} 张兑换码`, color: 'success' })
    await Promise.all([fetchBatches(), fetchList()])
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  }
}

// ----- 选项 -----
const statusItems = [
  { label: '全部', value: 'all' },
  { label: '可用', value: 'available' },
  { label: '已禁用', value: 'disabled' },
  { label: '已用完', value: 'used_up' },
  { label: '已过期', value: 'expired' },
]
const batchItems = computed(() => [
  { label: '全部批次', value: 'all' },
  ...batches.value.map(b => ({
    label: `${b.batchId} (${b.usedTotal}/${b.maxUsesTotal} 用 · ${b.amount} 余额)`,
    value: b.batchId,
  })),
])

function formatDate(iso: string | null) {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('zh-CN', { hour12: false }) }
  catch { return iso }
}

function statusOf(item: RedemptionCode): { label: string, color: 'success' | 'warning' | 'error' | 'neutral' } {
  if (!item.isEnabled) return { label: '已禁用', color: 'neutral' }
  if (item.usedCount >= item.maxUses) return { label: '已用完', color: 'warning' }
  if (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()) return { label: '已过期', color: 'error' }
  return { label: '可用', color: 'success' }
}

function getRowItems(row: RedemptionCode): DropdownMenuItem[] {
  return [{
    label: row.isEnabled ? '禁用' : '启用',
    icon: row.isEnabled ? 'i-mdi-toggle-switch-off-outline' : 'i-mdi-toggle-switch-outline',
    onSelect: () => toggle(row),
  }, {
    label: '复制兑换码',
    icon: 'i-mdi-content-copy',
    onSelect: () => copyOne(row.code),
  }, {
    type: 'separator',
  }, {
    label: '删除',
    icon: 'i-mdi-delete-outline',
    color: 'error' as const,
    onSelect: () => remove(row),
  }]
}

const columns: TableColumn<RedemptionCode>[] = [
  {
    accessorKey: 'code',
    header: '兑换码',
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h('span', {
        class: 'font-mono text-sm cursor-pointer hover:text-primary',
        onClick: () => copyOne(row.original.code),
        title: '点击复制',
      }, row.original.code),
      row.original.batchId
        ? h('span', { class: 'text-[11px] text-muted font-mono' }, row.original.batchId)
        : null,
    ].filter(Boolean)),
  },
  {
    accessorKey: 'amount',
    header: '面额',
    cell: ({ row }) => h('span', { class: 'tabular-nums font-semibold text-success' }, `+${row.original.amount.toLocaleString()}`),
  },
  {
    id: 'usage',
    header: '使用',
    cell: ({ row }) => h('span', { class: 'tabular-nums text-sm' },
      `${row.original.usedCount} / ${row.original.maxUses}`),
  },
  {
    accessorKey: 'note',
    header: '备注',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted truncate max-w-[200px] block' }, row.original.note || '-'),
  },
  {
    accessorKey: 'expiresAt',
    header: '过期时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted whitespace-nowrap' },
      row.original.expiresAt ? formatDate(row.original.expiresAt) : '永不过期'),
  },
  {
    id: 'status',
    header: '状态',
    cell: ({ row }) => {
      const s = statusOf(row.original)
      return h(UBadge, { color: s.color, variant: 'subtle' }, () => s.label)
    },
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted whitespace-nowrap' }, formatDate(row.original.createdAt)),
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
  <UDashboardPanel id="admin-redemption-codes">
    <template #header>
      <UDashboardNavbar title="兑换码">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-mdi-plus"
            color="primary"
            @click="openGenerate"
          >
            生成兑换码
          </UButton>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-mdi-refresh"
            :loading="loading"
            @click="fetchList"
          />
          <AdminHeaderUser />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <div class="flex flex-wrap items-center gap-2">
          <USelect
            v-model="filters.status"
            :items="statusItems"
            size="sm"
            class="w-32"
          />
          <USelect
            v-model="filters.batchId"
            :items="batchItems"
            size="sm"
            class="w-72"
          />
          <UInput
            v-model="filters.keyword"
            icon="i-mdi-magnify"
            placeholder="搜索兑换码 / 备注..."
            size="sm"
            class="max-w-xs"
            @keydown.enter="applyFilters"
          />
          <UButton
            size="sm"
            icon="i-mdi-magnify"
            @click="applyFilters"
          >
            查询
          </UButton>
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            @click="resetFilters"
          >
            重置
          </UButton>
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <!-- 批次摘要卡 -->
        <UCard v-if="batches.length > 0">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-package-variant"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                最近批次
              </h3>
              <span class="ml-auto text-xs text-muted">
                {{ batches.length }} 个批次
              </span>
            </div>
          </template>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div
              v-for="b in batches.slice(0, 8)"
              :key="b.batchId"
              class="rounded-lg border border-default p-3 bg-elevated/30"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-xs text-muted truncate">
                  {{ b.batchId }}
                </span>
                <UDropdownMenu
                  :items="[[
                    { label: '只看本批次', icon: 'i-mdi-filter-variant', onSelect: () => { filters.batchId = b.batchId; applyFilters() } },
                    { label: '禁用整批', icon: 'i-mdi-toggle-switch-off-outline', onSelect: () => toggleBatch(b.batchId, false) },
                    { label: '启用整批', icon: 'i-mdi-toggle-switch-outline', onSelect: () => toggleBatch(b.batchId, true) },
                  ], [
                    { label: '删除未使用', icon: 'i-mdi-delete-outline', onSelect: () => deleteBatch(b.batchId, false) },
                    { label: '删除全部', icon: 'i-mdi-delete-alert-outline', color: 'error' as const, onSelect: () => deleteBatch(b.batchId, true) },
                  ]]"
                >
                  <UButton
                    icon="i-mdi-dots-vertical"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                  />
                </UDropdownMenu>
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-xl font-semibold tabular-nums text-success">
                  +{{ b.amount.toLocaleString() }}
                </span>
                <span class="text-xs text-muted">/ 张</span>
              </div>
              <div class="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{{ b.total }} 张</span>
                <span class="tabular-nums">
                  使用 {{ b.usedTotal }}/{{ b.maxUsesTotal }}
                </span>
              </div>
              <div
                v-if="b.note"
                class="mt-1 text-xs text-muted truncate"
                :title="b.note"
              >
                {{ b.note }}
              </div>
            </div>
          </div>
        </UCard>

        <!-- 兑换码列表 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-ticket-percent-outline"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                兑换码列表
              </h3>
              <span class="ml-auto text-xs text-muted tabular-nums">
                共 {{ total.toLocaleString() }} 条
              </span>
            </div>
          </template>
          <UTable
            :data="items"
            :columns="columns"
            :loading="loading"
            empty="暂无兑换码"
            :ui="{
              base: 'table-fixed',
              thead: '[&>tr]:bg-elevated/50',
              th: 'py-2',
              td: 'py-2 align-middle',
            }"
          />
          <div
            v-if="total > pageSize"
            class="flex items-center justify-between pt-3 border-t border-default mt-3"
          >
            <span class="text-xs text-muted">
              第 {{ page }} / {{ totalPages }} 页
            </span>
            <div class="flex gap-2">
              <UButton
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-mdi-chevron-left"
                :disabled="page <= 1"
                @click="page = Math.max(1, page - 1)"
              >
                上一页
              </UButton>
              <UButton
                size="sm"
                color="neutral"
                variant="outline"
                trailing-icon="i-mdi-chevron-right"
                :disabled="page >= totalPages"
                @click="page = Math.min(totalPages, page + 1)"
              >
                下一页
              </UButton>
            </div>
          </div>
        </UCard>
      </div>

      <!-- 生成弹窗 -->
      <UModal v-model:open="generateOpen">
        <template #content>
          <div class="p-6 max-h-[85vh] overflow-y-auto">
            <h3 class="text-lg font-semibold mb-4">
              生成兑换码
            </h3>

            <div
              v-if="!generatedResult"
              class="space-y-3"
            >
              <div class="grid grid-cols-2 gap-3">
                <UFormField label="单张面额（必填）">
                  <UInput
                    v-model.number="generateForm.amount"
                    type="number"
                    min="1"
                    placeholder="例如 100"
                  />
                </UFormField>
                <UFormField label="生成数量">
                  <UInput
                    v-model.number="generateForm.count"
                    type="number"
                    min="1"
                    max="1000"
                  />
                </UFormField>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <UFormField
                  label="码长度"
                  hint="不含前缀，8 - 48"
                >
                  <UInput
                    v-model.number="generateForm.length"
                    type="number"
                    min="8"
                    max="48"
                  />
                </UFormField>
                <UFormField
                  label="前缀（可选）"
                  hint="如 WELCOME"
                >
                  <UInput
                    v-model="generateForm.prefix"
                    placeholder=""
                  />
                </UFormField>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <UFormField
                  label="单张可被兑换次数"
                  hint=">1 表示同一码可被多个用户共享，每人 1 次"
                >
                  <UInput
                    v-model.number="generateForm.maxUses"
                    type="number"
                    min="1"
                  />
                </UFormField>
                <UFormField
                  label="过期时间（天）"
                  hint="0 = 永不过期"
                >
                  <UInput
                    v-model.number="generateForm.expiresInDays"
                    type="number"
                    min="0"
                  />
                </UFormField>
              </div>
              <UFormField label="备注（可选）">
                <UInput
                  v-model="generateForm.note"
                  placeholder="例如：双十一活动"
                />
              </UFormField>
              <div class="flex justify-end gap-2 pt-3">
                <UButton
                  variant="outline"
                  color="neutral"
                  @click="generateOpen = false"
                >
                  取消
                </UButton>
                <UButton
                  :loading="generating"
                  @click="submitGenerate"
                >
                  生成
                </UButton>
              </div>
            </div>

            <div
              v-else
              class="space-y-3"
            >
              <UAlert
                color="success"
                variant="subtle"
                icon="i-mdi-check-circle-outline"
                :title="`已生成 ${generatedResult.generated} 张兑换码`"
                :description="`批次 ${generatedResult.batchId}` + (generatedResult.generated < generatedResult.requested
                  ? ` · 申请 ${generatedResult.requested} 张，因冲突实际生成 ${generatedResult.generated} 张` : '')"
              />
              <div class="flex justify-end">
                <UButton
                  size="sm"
                  variant="outline"
                  icon="i-mdi-content-copy"
                  @click="copyAllCodes"
                >
                  复制全部
                </UButton>
              </div>
              <div class="rounded-lg border border-default p-3 bg-elevated/30 max-h-72 overflow-auto">
                <div
                  v-for="c in generatedResult.codes"
                  :key="c.id"
                  class="flex items-center justify-between gap-2 py-1"
                >
                  <span class="font-mono text-sm">
                    {{ c.code }}
                  </span>
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-mdi-content-copy"
                    @click="copyOne(c.code)"
                  />
                </div>
              </div>
              <div class="flex justify-end gap-2 pt-3">
                <UButton
                  variant="outline"
                  color="neutral"
                  @click="generatedResult = null"
                >
                  继续生成
                </UButton>
                <UButton @click="generateOpen = false">
                  完成
                </UButton>
              </div>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
