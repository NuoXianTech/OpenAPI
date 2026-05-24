<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPagedList } from '~/composables/dashboard/useAdminPagedList'

useHead({ title: '操作日志' })
definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

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

// 用 type 别名而非 interface：useAdminPagedList 的 TFilters 受 Record<string, unknown> 约束，
// interface 因为可扩展不被认为兼容，type 字面量则会通过结构性检查。
type OperationLogFilters = {
  startAt: string
  endAt: string
  userId: number | ''
  actorKind: 'all' | 'admin' | 'user'
  actor: string
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
  total,
  status,
  applyFilters,
  reset
} = useAdminPagedList<OperationLogFilters, OperationLogRow>({
  path: '/api/admin/operation-logs/list',
  defaultFilters: {
    startAt: '',
    endAt: '',
    userId: '',
    actorKind: 'all',
    actor: '',
    action: '',
    resourceType: '',
    status: 'all'
  },
  defaultPageSize: localPageSize,
  buildQuery: (f, p) => ({
    startAt: f.startAt ? new Date(f.startAt).toISOString() : undefined,
    endAt: f.endAt ? new Date(f.endAt).toISOString() : undefined,
    userId: f.userId || undefined,
    actorKind: f.actorKind === 'all' ? undefined : f.actorKind,
    actor: f.actor.trim() || undefined,
    action: f.action.trim() || undefined,
    resourceType: f.resourceType.trim() || undefined,
    status: f.status === 'all' ? undefined : f.status,
    limit: p.limit,
    offset: p.offset
  })
})

const loading = computed(() => status.value === 'pending')

const expandedFilters = ref(false)
const hasAdvancedFilters = computed(
  () => filters.userId !== '' || !!filters.action || !!filters.resourceType
)

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
  { id: 'actions', header: '' }
]

// ─── 详情弹窗 ───────────────────────────────────────────────────
const detailRow = ref<OperationLogRow | null>(null)
const detailOpen = ref(false)

function openDetail(row: OperationLogRow) {
  detailRow.value = row
  detailOpen.value = true
}

const detailJson = computed(() => {
  if (!detailRow.value?.detail) return ''
  try {
    return JSON.stringify(detailRow.value.detail, null, 2)
  } catch {
    return String(detailRow.value.detail)
  }
})
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
          <span class="ml-auto text-xs text-muted tabular-nums">
            共 {{ total.toLocaleString() }} 条
          </span>
        </div>
      </template>

      <div class="space-y-3">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField
            label="开始时间"
            class="min-w-[200px]"
          >
            <UInput
              v-model="filters.startAt"
              type="datetime-local"
            />
          </UFormField>
          <UFormField
            label="结束时间"
            class="min-w-[200px]"
          >
            <UInput
              v-model="filters.endAt"
              type="datetime-local"
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
            label="操作者"
            hint="名称模糊匹配"
            class="min-w-[180px]"
          >
            <UInput
              v-model="filters.actor"
              placeholder="留空查全部"
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

          <UButton
            :color="expandedFilters ? 'primary' : 'neutral'"
            variant="outline"
            :icon="expandedFilters ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'"
            @click="expandedFilters = !expandedFilters"
          >
            展开
            <UBadge
              v-if="hasAdvancedFilters"
              color="primary"
              variant="solid"
              size="sm"
              class="ml-1"
            >
              ·
            </UBadge>
          </UButton>
        </div>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="expandedFilters"
            class="flex flex-wrap items-end gap-3 border-t border-default pt-3"
          >
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
              label="动作前缀"
              hint="例如 admin.user."
              class="min-w-[200px]"
            >
              <UInput
                v-model="filters.action"
                placeholder="留空查全部"
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
          </div>
        </Transition>

        <div class="flex justify-end gap-2 pt-1">
          <UButton
            color="neutral"
            variant="outline"
            @click="reset"
          >
            重置
          </UButton>
          <UButton
            icon="i-mdi-magnify"
            @click="applyFilters"
          >
            查询
          </UButton>
        </div>
      </div>

      <div class="mt-4">
        <DashboardDataTable
          :data="items"
          :columns="columns"
          :loading="loading"
          empty-title="暂无操作日志"
          empty-icon="i-mdi-clipboard-text-clock-outline"
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
              size="sm"
            >
              {{ row.original.status === 'success' ? '成功' : '失败' }}
            </UBadge>
          </template>
          <template #ip-cell="{ row }">
            <span class="font-mono text-xs text-muted">{{ row.original.ip || '-' }}</span>
          </template>
          <template #actions-cell="{ row }">
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-mdi-eye-outline"
              aria-label="查看详情"
              @click="openDetail(row.original)"
            />
          </template>
        </DashboardDataTable>
      </div>

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

    <UModal
      v-model:open="detailOpen"
      title="操作详情"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <div
          v-if="detailRow"
          class="space-y-4 text-sm"
        >
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs text-muted">
                时间
              </div>
              <div>{{ formatDate(detailRow.createdAt) }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">
                状态
              </div>
              <UBadge
                :color="detailRow.status === 'success' ? 'success' : 'error'"
                variant="subtle"
                size="sm"
                class="w-fit"
              >
                {{ detailRow.status === 'success' ? '成功' : '失败' }}
              </UBadge>
            </div>
            <div>
              <div class="text-xs text-muted">
                操作者
              </div>
              <div>
                {{ detailRow.actor || '匿名' }}
                <span class="text-muted text-xs">
                  · {{ detailRow.userId ? `用户 #${detailRow.userId}` : '管理员' }}
                </span>
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">
                动作
              </div>
              <div class="font-mono text-xs break-all">
                {{ detailRow.action }}
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">
                资源类型
              </div>
              <div class="font-mono text-xs">
                {{ detailRow.resourceType || '-' }}
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">
                资源 ID
              </div>
              <div class="font-mono text-xs break-all">
                {{ detailRow.resourceId || '-' }}
              </div>
            </div>
          </div>

          <UCard
            :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }"
          >
            <template #header>
              <span class="text-xs font-semibold text-muted">客户端</span>
            </template>
            <div class="space-y-1 text-xs">
              <div>
                <span class="text-muted">IP </span>
                <span class="font-mono">{{ detailRow.ip || '-' }}</span>
              </div>
              <div>
                <span class="text-muted">User-Agent </span>
                <span class="font-mono break-all">{{ detailRow.userAgent || '-' }}</span>
              </div>
            </div>
          </UCard>

          <UCard
            v-if="detailRow.detail"
            :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }"
          >
            <template #header>
              <span class="text-xs font-semibold text-muted">详情</span>
            </template>
            <pre class="font-mono text-xs whitespace-pre-wrap break-all">{{ detailJson }}</pre>
          </UCard>
        </div>
      </template>
    </UModal>
  </div>
</template>
