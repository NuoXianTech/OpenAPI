<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPagedList } from '~/composables/dashboard/useAdminPagedList'

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

interface OperationLogFilters {
  userId: number | ''
  actorKind: 'all' | 'admin' | 'user'
  action: string
  resourceType: string
  status: 'all' | 'success' | 'failure'
}

const localPageSize = 50
const {
  filters,
  page,
  pageSize,
  items,
  status,
  applyFilters,
  reset
} = useAdminPagedList<OperationLogFilters, OperationLogRow>({
  path: '/api/admin/operation-logs/list',
  defaultFilters: {
    userId: '',
    actorKind: 'all',
    action: '',
    resourceType: '',
    status: 'all'
  },
  defaultPageSize: localPageSize,
  immediate: false,
  buildQuery: (f, p) => ({
    userId: f.userId || undefined,
    actorKind: f.actorKind === 'all' ? undefined : f.actorKind,
    action: f.action.trim() || undefined,
    resourceType: f.resourceType.trim() || undefined,
    status: f.status === 'all' ? undefined : f.status,
    limit: p.limit,
    offset: p.offset
  })
})

const loading = computed(() => status.value === 'pending')

watch(() => props.defaultUserId, (val) => {
  if (typeof val === 'number') filters.userId = val
  void applyFilters()
}, { immediate: true })

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
  { accessorKey: 'createdAt', header: '时间' },
  { id: 'actor', header: '操作者' },
  { accessorKey: 'action', header: '动作' },
  { id: 'resource', header: '资源' },
  { accessorKey: 'status', header: '状态' },
  { accessorKey: 'ip', header: 'IP' },
  { id: 'detail', header: '详情' }
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
            @click="applyFilters"
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
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDate(row.original.createdAt) }}</span>
        </template>
        <template #actor-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span class="font-medium">{{ row.original.actor || '匿名' }}</span>
            <span class="text-muted">{{ row.original.userId ? `用户 #${row.original.userId}` : '管理员' }}</span>
          </div>
        </template>
        <template #action-cell="{ row }">
          <span class="font-mono text-xs">{{ row.original.action }}</span>
        </template>
        <template #resource-cell="{ row }">
          <span
            v-if="!row.original.resourceType && !row.original.resourceId"
            class="text-muted"
          >-</span>
          <div
            v-else
            class="flex flex-col text-xs"
          >
            <span
              v-if="row.original.resourceType"
              class="font-mono"
            >{{ row.original.resourceType }}</span>
            <span
              v-if="row.original.resourceId"
              class="font-mono text-muted"
            >#{{ row.original.resourceId }}</span>
          </div>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'success' ? 'success' : 'error'"
            variant="subtle"
          >
            {{ row.original.status === 'success' ? '成功' : '失败' }}
          </UBadge>
        </template>
        <template #ip-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{ row.original.ip || '-' }}</span>
        </template>
        <template #detail-cell="{ row }">
          <span
            v-if="!row.original.detail"
            class="text-muted"
          >-</span>
          <span
            v-else
            class="font-mono text-xs text-muted truncate max-w-[260px] block"
            :title="JSON.stringify(row.original.detail)"
          >{{ JSON.stringify(row.original.detail) }}</span>
        </template>
      </UTable>
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
