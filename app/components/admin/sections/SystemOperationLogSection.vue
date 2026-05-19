<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface OperationLogRow {
  id: number
  userId: number | null
  actor: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  ip: string | null
  userAgent: string | null
  detail: Record<string, unknown> | null
  status: 'success' | 'failure'
  createdAt: string
}

const props = defineProps<{ defaultUserId?: number }>()

const UBadge = resolveComponent('UBadge')

const filters = reactive({
  userId: '' as number | '',
  actorKind: 'all' as 'all' | 'admin' | 'user',
  action: '',
  resourceType: '',
  status: 'all' as 'all' | 'success' | 'failure'
})
const page = ref(1)
const pageSize = ref(50)
const items = ref<OperationLogRow[]>([])
const loading = ref(false)

watch(() => props.defaultUserId, (val) => {
  if (typeof val === 'number') {
    filters.userId = val
    page.value = 1
    void fetchLogs()
  }
}, { immediate: true })

async function fetchLogs() {
  loading.value = true
  try {
    const res = await $fetch<OperationLogRow[]>('/api/admin/operation-logs/list', {
      query: {
        userId: filters.userId || undefined,
        actorKind: filters.actorKind === 'all' ? undefined : filters.actorKind,
        action: filters.action.trim() || undefined,
        resourceType: filters.resourceType.trim() || undefined,
        status: filters.status === 'all' ? undefined : filters.status,
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value
      }
    })
    items.value = res || []
  } catch (err) {
    console.error('failed to fetch operation logs', err)
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(page, () => {
  void fetchLogs()
})

onMounted(() => {
  if (typeof props.defaultUserId !== 'number') void fetchLogs()
})

function apply() {
  page.value = 1
  void fetchLogs()
}

function reset() {
  filters.userId = ''
  filters.actorKind = 'all'
  filters.action = ''
  filters.resourceType = ''
  filters.status = 'all'
  page.value = 1
  void fetchLogs()
}

function formatDate(val: string) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

const actorKindItems = [
  { label: '全部来源', value: 'all' },
  { label: '管理员操作', value: 'admin' },
  { label: '用户操作', value: 'user' }
]
const statusItems = [
  { label: '全部状态', value: 'all' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failure' }
]

const columns: TableColumn<OperationLogRow>[] = [
  {
    accessorKey: 'createdAt',
    header: '时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted whitespace-nowrap' }, formatDate(row.original.createdAt))
  },
  {
    id: 'actor',
    header: '操作者',
    cell: ({ row }) => h('div', { class: 'flex flex-col text-xs' }, [
      h('span', { class: 'font-medium' }, row.original.actor || '匿名'),
      row.original.userId
        ? h('span', { class: 'text-muted' }, `用户 #${row.original.userId}`)
        : h('span', { class: 'text-muted' }, '管理员')
    ])
  },
  {
    accessorKey: 'action',
    header: '动作',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.original.action)
  },
  {
    id: 'resource',
    header: '资源',
    cell: ({ row }) => {
      const t = row.original.resourceType
      const id = row.original.resourceId
      if (!t && !id) return h('span', { class: 'text-muted' }, '-')
      return h('div', { class: 'flex flex-col text-xs' }, [
        t ? h('span', { class: 'font-mono' }, t) : null,
        id ? h('span', { class: 'font-mono text-muted' }, `#${id}`) : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => row.original.status === 'success'
      ? h(UBadge, { color: 'success', variant: 'subtle' }, () => '成功')
      : h(UBadge, { color: 'error', variant: 'subtle' }, () => '失败')
  },
  {
    accessorKey: 'ip',
    header: 'IP',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.original.ip || '-')
  },
  {
    id: 'detail',
    header: '详情',
    cell: ({ row }) => {
      if (!row.original.detail) return h('span', { class: 'text-muted' }, '-')
      const text = JSON.stringify(row.original.detail)
      return h('span', {
        class: 'font-mono text-xs text-muted truncate max-w-[260px] block',
        title: text
      }, text)
    }
  }
]
</script>

<template>
  <div class="space-y-4">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2 flex-wrap">
          <UIcon
            name="i-mdi-clipboard-text-clock-outline"
            class="size-5 text-muted"
          />
          <h3 class="font-semibold">
            操作日志
          </h3>
          <span class="ml-auto text-xs text-muted">仅最近 200 条/页</span>
        </div>
      </template>

      <div class="flex flex-wrap items-end gap-3 mb-4">
        <UFormField
          label="用户 ID"
          class="min-w-[140px]"
        >
          <UInput
            v-model.number="filters.userId"
            type="number"
            placeholder="留空查全部"
          />
        </UFormField>
        <UFormField
          label="来源"
          class="min-w-[140px]"
        >
          <USelect
            v-model="filters.actorKind"
            :items="actorKindItems"
          />
        </UFormField>
        <UFormField
          label="动作前缀"
          class="min-w-[180px]"
        >
          <UInput
            v-model="filters.action"
            placeholder="如 admin.user."
          />
        </UFormField>
        <UFormField
          label="资源类型"
          class="min-w-[160px]"
        >
          <UInput
            v-model="filters.resourceType"
            placeholder="如 api / user"
          />
        </UFormField>
        <UFormField
          label="状态"
          class="min-w-[140px]"
        >
          <USelect
            v-model="filters.status"
            :items="statusItems"
          />
        </UFormField>
        <div class="flex gap-2">
          <UButton
            icon="i-mdi-magnify"
            @click="apply"
          >
            查询
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            @click="reset"
          >
            重置
          </UButton>
        </div>
      </div>

      <UTable
        :data="items"
        :columns="columns"
        :loading="loading"
        :ui="{
          base: 'table-fixed',
          thead: '[&>tr]:bg-elevated/50',
          th: 'py-2',
          td: 'py-2 align-middle'
        }"
      />
      <div class="flex items-center justify-between pt-3 border-t border-default mt-3">
        <span class="text-xs text-muted tabular-nums">
          第 {{ page }} 页 · 本页 {{ items.length }} 条
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
            :disabled="items.length < pageSize"
            @click="page = page + 1"
          >
            下一页
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
