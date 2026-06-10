<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { usePrivatePagedList } from '~/composables/dashboard/usePrivatePagedList'

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

// 用 type 别名而非 interface：usePrivatePagedList 的 TFilters 受 Record<string, unknown> 约束，
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
  loading,
  applyFilters,
  reset
} = usePrivatePagedList<OperationLogFilters, OperationLogRow>({
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

const expandedFilters = ref(false)
const hasAdvancedFilters = computed(
  () => filters.actorKind !== 'all'
    || !!filters.actor
    || filters.status !== 'all'
    || filters.userId !== ''
    || !!filters.action
    || !!filters.resourceType
)
const activeFilterCount = computed(() => [
  !!filters.startAt,
  !!filters.endAt,
  filters.userId !== '',
  filters.actorKind !== 'all',
  !!filters.actor,
  !!filters.action,
  !!filters.resourceType,
  filters.status !== 'all'
].filter(Boolean).length)

function formatDate(val: string) {
  return formatDateTime(val)
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
  <div class="log-page-shell space-y-6">
    <section class="log-page-hero relative overflow-hidden rounded-2xl border border-default p-5 sm:p-6">
      <div class="relative z-10 space-y-3">
        <UBadge
          color="neutral"
          variant="solid"
          size="sm"
          class="bg-elevated/80 text-default backdrop-blur"
        >
          Audit trail
        </UBadge>
        <div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
            操作日志
          </h2>
          <p class="mt-1 text-sm text-toned">
            后台动作、资源变更与操作者审计轨迹
          </p>
        </div>
      </div>
    </section>

    <UCard
      class="log-filter-card"
      variant="subtle"
      :ui="{ body: 'p-4 sm:p-5' }"
    >
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-mdi-filter-variant"
              class="size-4 text-muted"
            />
            <h3 class="text-sm font-semibold text-highlighted">
              筛选条件
            </h3>
          </div>
          <UBadge
            color="neutral"
            variant="subtle"
            size="sm"
          >
            {{ activeFilterCount ? `${activeFilterCount} 项筛选` : '未筛选' }}
          </UBadge>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <UFormField label="开始时间">
            <UInput
              v-model="filters.startAt"
              type="datetime-local"
              class="w-full"
            />
          </UFormField>
          <UFormField label="结束时间">
            <UInput
              v-model="filters.endAt"
              type="datetime-local"
              class="w-full"
            />
          </UFormField>
          <UFormField label="来源">
            <USelect
              v-model="filters.actorKind"
              :items="actorKindItems"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="操作者"
            hint="名称模糊匹配"
          >
            <UInput
              v-model="filters.actor"
              placeholder="留空查全部"
              class="w-full"
            />
          </UFormField>
          <UFormField label="状态">
            <USelect
              v-model="filters.status"
              :items="statusItems"
              class="w-full"
            />
          </UFormField>
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
            class="grid gap-3 border-t border-default pt-4 md:grid-cols-3"
          >
            <UFormField label="用户 ID">
              <UInput
                v-model.number="filters.userId"
                type="number"
                placeholder="留空查全部"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="动作前缀"
              hint="例如 admin.user."
            >
              <UInput
                v-model="filters.action"
                placeholder="留空查全部"
                class="w-full"
              />
            </UFormField>
            <UFormField label="资源类型">
              <UInput
                v-model="filters.resourceType"
                placeholder="如 api / user"
                class="w-full"
              />
            </UFormField>
          </div>
        </Transition>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
          <UButton
            :color="expandedFilters || hasAdvancedFilters ? 'primary' : 'neutral'"
            variant="outline"
            :icon="expandedFilters ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'"
            @click="expandedFilters = !expandedFilters"
          >
            更多筛选
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
          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-mdi-restore"
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
      </div>
    </UCard>

    <UCard
      class="log-table-card overflow-hidden"
      variant="subtle"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <template #header>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-mdi-clipboard-text-clock-outline"
              class="size-5 text-muted"
            />
            <h3 class="text-lg font-semibold text-highlighted">
              操作明细
            </h3>
          </div>
          <span class="ml-auto text-xs text-muted tabular-nums">
            共 {{ total.toLocaleString() }} 条
          </span>
        </div>
      </template>

      <DashboardDataTable
        v-model:page="page"
        :data="items"
        :columns="columns"
        :loading="loading"
        :page-size="pageSize"
        :total="total"
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

<style scoped>
.log-page-hero {
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--ui-primary) 12%, transparent) 0%, transparent 55%),
    radial-gradient(110% 90% at 100% 0%, color-mix(in oklab, var(--ui-warning) 10%, transparent) 0%, transparent 58%),
    var(--ui-bg);
}
</style>
