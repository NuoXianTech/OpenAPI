<script setup lang="ts">
import { LazyAdminCallLogDetailModal } from '#components'
import {
  ADMIN_CALL_LOG_TYPE_META,
  useAdminCallLogsPage
} from '~/composables/admin/use-admin-call-logs-page'
import type { AdminLogRow } from '#shared/types/admin'

useHead({ title: '调用日志' })
const route = useRoute()
const router = useRouter()
const {
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
  applyFilters,
  resetFilters,
  typeSelectItems,
  apiSelectItems,
  categorySelectItems,
  activeFilterCount,
  columns,
  loadFilterOptions
} = useAdminCallLogsPage({
  routeQuery: computed(() => route.query),
  replaceQuery: async (query) => {
    await router.replace({ query })
  }
})

const overlay = useOverlay()

onMounted(() => {
  void loadFilterOptions()
})

function openDetail(row: AdminLogRow) {
  const detailModal = overlay.create(LazyAdminCallLogDetailModal, {
    destroyOnClose: true,
    props: { row }
  })
  void detailModal.open()
}
</script>

<template>
  <div class="space-y-6">
    <section class="dashboard-hero-surface dashboard-hero-surface-info relative overflow-hidden rounded-lg border border-default p-5 sm:p-6">
      <div class="relative z-10 space-y-3">
        <div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
            调用日志
          </h2>
          <p class="mt-1 text-sm text-toned">
            公共接口调用流水、扣费结果与客户端上下文
          </p>
        </div>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <AdminFilterPopover
        :active-count="activeFilterCount"
        title="调用日志筛选"
        panel-class="w-[min(calc(100vw-2rem),42rem)] p-3"
        @apply="applyFilters"
        @reset="resetFilters"
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
          <UFormField label="接口名称">
            <USelectMenu
              v-model="filters.apiId"
              :items="apiSelectItems"
              value-key="value"
              searchable
              placeholder="全部接口"
              class="w-full"
            />
          </UFormField>
          <UFormField label="分类">
            <USelect
              v-model="filters.categoryId"
              :items="categorySelectItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField label="类型">
            <USelectMenu
              v-model="filters.types"
              :items="typeSelectItems"
              value-key="value"
              multiple
              placeholder="所有类型"
              class="w-full"
            />
          </UFormField>
          <div class="border-t border-default pt-3 md:col-span-2">
            <p class="mb-3 text-xs font-medium text-muted">
              精确筛选
            </p>
            <div class="grid gap-3 md:grid-cols-3">
              <UFormField
                label="密钥名称"
                hint="按 API Key ID 筛选"
              >
                <UInput
                  v-model.number="filters.apiKeyId"
                  type="number"
                  placeholder="留空查全部"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="用户"
                hint="按用户 ID 筛选"
              >
                <UInput
                  v-model.number="filters.userId"
                  type="number"
                  placeholder="留空查全部"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="请求 ID">
                <UInput
                  v-model="filters.requestId"
                  placeholder="UUID，精确匹配"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </div>
      </AdminFilterPopover>
    </div>

    <DashboardTableCard
      title="调用明细"
      icon="i-mdi-text-box-search-outline"
      :total="total"
    >
      <DashboardDataTable
        v-model:page="page"
        :data="items"
        :columns="columns"
        :loading="loading"
        :page-size="pageSize"
        :total="total"
        empty-title="暂无日志"
        empty-icon="i-mdi-text-box-search-outline"
      >
        <template #createdAt-cell="{ row }">
          <div class="flex flex-col gap-1 min-w-[150px]">
            <span class="text-xs whitespace-nowrap">
              {{ formatDateTime(row.original.createdAt) }}
            </span>
            <UBadge
              :color="ADMIN_CALL_LOG_TYPE_META[row.original.type].color"
              :icon="ADMIN_CALL_LOG_TYPE_META[row.original.type].icon"
              variant="subtle"
              size="sm"
              class="w-fit"
            >
              {{ ADMIN_CALL_LOG_TYPE_META[row.original.type].label }}
            </UBadge>
          </div>
        </template>

        <template #userName-cell="{ row }">
          <div
            v-if="row.original.userId"
            class="flex flex-col text-xs"
          >
            <span>{{ row.original.userName || '-' }}</span>
            <span class="text-muted">{{ formatUserIdentity(row.original.userId) }}</span>
          </div>
          <span
            v-else
            class="text-xs text-muted italic"
          >匿名</span>
        </template>

        <template #apiKeyName-cell="{ row }">
          <span
            v-if="row.original.apiKeyName || row.original.apiKeyId"
            class="text-xs"
          >{{ row.original.apiKeyName || `#${row.original.apiKeyId}` }}</span>
          <span
            v-else
            class="text-xs text-muted italic"
          >-</span>
        </template>

        <template #apiName-cell="{ row }">
          <div
            v-if="row.original.apiName"
            class="flex flex-col"
          >
            <span class="text-sm font-medium">{{ row.original.apiName }}</span>
            <span class="font-mono text-xs text-muted">{{ row.original.apiPath }}</span>
          </div>
          <span
            v-else
            class="text-xs text-muted italic"
          >-</span>
        </template>

        <template #cost-cell="{ row }">
          <span
            class="tabular-nums text-sm"
            :class="row.original.cost > 0 ? 'text-warning font-medium' : 'text-muted'"
          >
            {{ row.original.cost > 0 ? `-${row.original.cost}` : '免费' }}
          </span>
        </template>

        <template #summary-cell="{ row }">
          <div class="flex flex-col text-xs gap-0.5">
            <div class="flex items-center gap-1.5">
              <UBadge
                color="neutral"
                variant="subtle"
                size="sm"
                class="font-mono"
              >
                {{ row.original.method }}
              </UBadge>
              <span
                class="tabular-nums"
                :class="row.original.statusCode >= 400 ? 'text-error' : 'text-default'"
              >
                {{ row.original.statusCode }}
              </span>
              <span class="text-muted tabular-nums">
                · {{ row.original.latencyMs }}ms
              </span>
              <UBadge
                v-if="!row.original.isCounted"
                color="warning"
                variant="subtle"
                size="sm"
                title="未计入统计"
              >
                拒绝
              </UBadge>
            </div>
            <span
              v-if="row.original.errorMessage"
              class="text-muted truncate max-w-[280px]"
              :title="row.original.errorMessage"
            >
              {{ row.original.errorCode ? `${row.original.errorCode}: ` : '' }}{{ row.original.errorMessage }}
            </span>
          </div>
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
  </div>
</template>
