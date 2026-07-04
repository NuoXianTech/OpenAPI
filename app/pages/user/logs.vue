<script setup lang="ts">
import { LazyUserCallLogDetailModal } from '#components'
import {
  useUserCallLogsPage,
  userCallOutcomeColor,
  userCallOutcomeIcon,
  userCallOutcomeLabel,
  type UserCallLogRow
} from '~/composables/user/use-user-call-logs-page'

useHead({ title: '调用日志' })

definePageMeta({ layout: 'user', middleware: 'auth-user' })

const route = useRoute()
const router = useRouter()
const {
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
  refresh,
  applyFilters,
  resetFilters,
  apiSelectItems,
  keySelectItems,
  statusSelectItems,
  activeFilterCount,
  columns,
  loadFilterOptions
} = useUserCallLogsPage({
  routeQuery: computed(() => route.query),
  replaceQuery: async (query) => {
    await router.replace({ query })
  }
})

const overlay = useOverlay()
const detailModal = overlay.create(LazyUserCallLogDetailModal, { destroyOnClose: true })

onMounted(() => {
  void loadFilterOptions()
})

function formatDate(iso: string) {
  return formatDateTime(iso)
}

function openDetail(row: UserCallLogRow) {
  detailModal.open({ row })
}
</script>

<template>
  <UDashboardPanel id="user-logs">
    <template #header>
      <UDashboardNavbar
        title="调用日志"
        class="dashboard-navbar"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UserHeaderActions
            :on-refresh="refresh"
            :refreshing="loading"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="log-page-shell space-y-6">
        <section class="log-page-hero relative overflow-hidden rounded-2xl border border-default p-5 sm:p-6">
          <div class="relative z-10 space-y-3">
            <UBadge
              color="neutral"
              variant="solid"
              size="sm"
              class="bg-elevated/80 text-default backdrop-blur"
            >
              Usage logs
            </UBadge>
            <div>
              <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
                调用日志
              </h2>
              <p class="mt-1 text-sm text-toned">
                你的接口调用流水、扣费结果与请求状态
              </p>
            </div>
          </div>
        </section>

        <!-- 筛选区 -->
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

            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <UFormField label="服务（API）">
                <USelectMenu
                  v-model="filters.apiId"
                  :items="apiSelectItems"
                  value-key="value"
                  searchable
                  placeholder="全部 API"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="API Key">
                <USelect
                  v-model="filters.apiKeyId"
                  :items="keySelectItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="状态">
                <USelect
                  v-model="filters.status"
                  :items="statusSelectItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-default pt-4">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-mdi-restore"
                @click="resetFilters"
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
        </UCard>

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
            empty-title="暂无调用记录"
            empty-icon="i-mdi-text-box-search-outline"
          >
            <template #createdAt-cell="{ row }">
              <div class="flex flex-col gap-1 min-w-[150px]">
                <span class="text-xs whitespace-nowrap">
                  {{ formatDate(row.original.createdAt) }}
                </span>
                <UBadge
                  :color="userCallOutcomeColor(row.original)"
                  :icon="userCallOutcomeIcon(row.original)"
                  variant="subtle"
                  size="sm"
                  class="w-fit"
                >
                  {{ userCallOutcomeLabel(row.original) }}
                </UBadge>
              </div>
            </template>

            <template #apiKeyName-cell="{ row }">
              <span
                v-if="row.original.apiKeyName || row.original.apiKeyId"
                class="text-xs"
              >{{ row.original.apiKeyName || `#${row.original.apiKeyId}` }}</span>
              <span
                v-else
                class="text-xs text-muted italic"
              >未携带</span>
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
                class="font-mono text-xs text-muted"
              >{{ row.original.apiPath }}</span>
            </template>

            <template #creditsCost-cell="{ row }">
              <span
                class="tabular-nums text-sm"
                :class="row.original.creditsCost > 0 ? 'text-warning font-medium' : 'text-muted'"
              >
                {{ row.original.creditsCost > 0 ? `-${row.original.creditsCost}` : '免费' }}
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
  </UDashboardPanel>
</template>

<style scoped>
.log-page-hero {
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--ui-primary) 12%, transparent) 0%, transparent 55%),
    radial-gradient(110% 90% at 100% 0%, color-mix(in oklab, var(--ui-info) 10%, transparent) 0%, transparent 58%),
    var(--ui-bg);
}
</style>
