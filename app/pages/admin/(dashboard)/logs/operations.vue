<script setup lang="ts">
import { PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import { useAdminOperationLogList } from '~/composables/admin/use-admin-call-logs-page'
import { adminModalUi } from '~/utils/admin-modal-ui'

useHead({ title: '操作日志' })
const {
  actorKindItems,
  activeFilterCount,
  applyFilters,
  columns,
  detailJson,
  detailOpen,
  detailRow,
  filters,
  items,
  loading,
  refresh,
  openDetail,
  page,
  pageSize,
  reset,
  resolveActorLabel,
  resolveActionLabel,
  statusItems,
  total,
} = useAdminOperationLogList()
</script>

<template>
  <div class="space-y-6">
    <section class="dashboard-hero-surface dashboard-hero-surface-warning relative overflow-hidden rounded-lg border border-default p-5 sm:p-6">
      <div class="relative z-10 space-y-3">
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

    <div class="flex flex-wrap items-center gap-2">
      <AdminFilterPopover
        :active-count="activeFilterCount"
        title="操作日志筛选"
        panel-class="w-[min(calc(100vw-2rem),42rem)] p-3"
        @apply="applyFilters"
        @reset="reset"
      >
        <div class="grid gap-3 md:grid-cols-2">
          <UFormField
            label="时间范围"
            class="md:col-span-2"
          >
            <CommonDateRangePicker
              v-model:start="filters.startAt"
              v-model:end="filters.endAt"
              placeholder="全部时间"
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
          <div class="border-t border-default pt-3 md:col-span-2">
            <p class="mb-3 text-xs font-medium text-muted">
              精确筛选
            </p>
            <div class="grid gap-3 md:grid-cols-3">
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
          </div>
        </div>
      </AdminFilterPopover>
      <UButton
        class="ml-auto"
        icon="i-mdi-refresh"
        color="neutral"
        variant="outline"
        :loading="loading"
        @click="refresh"
      >
        刷新
      </UButton>
    </div>

    <DashboardTableCard
      title="操作明细"
      icon="i-mdi-clipboard-text-clock-outline"
      :total="total"
    >
      <DashboardDataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        :data="items"
        :columns="columns"
        :loading="loading"
        :total="total"
        :page-size-items="PAGE_SIZE_ITEMS"
        empty-title="暂无操作日志"
        empty-icon="i-mdi-clipboard-text-clock-outline"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt) }}</span>
        </template>
        <template #actor-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span class="font-medium">{{ row.original.actor || '匿名' }}</span>
            <span class="text-muted">
              {{ resolveActorLabel(row.original.action, row.original.userId, row.original.actorRole) }}
            </span>
          </div>
        </template>
        <template #action-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span class="font-medium">{{ resolveActionLabel(row.original.action) }}</span>
            <span class="font-mono text-muted">{{ row.original.action }}</span>
          </div>
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
    </DashboardTableCard>

    <UModal
      v-model:open="detailOpen"
      title="操作详情"
      :ui="adminModalUi({ content: 'max-w-2xl' })"
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
              <div>{{ formatDateTime(detailRow.createdAt) }}</div>
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
                  · {{ resolveActorLabel(detailRow.action, detailRow.userId, detailRow.actorRole) }}
                </span>
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">
                动作
              </div>
              <div>{{ resolveActionLabel(detailRow.action) }}</div>
              <div class="font-mono text-xs text-muted break-all">
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
