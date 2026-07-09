<script setup lang="ts">
import { LazyUserCallLogDetailModal } from '#components'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import {
  useUserCallLogsPage,
  userCallOutcomeColor,
  userCallOutcomeIcon,
  userCallOutcomeLabel,
  type UserCallLogRow
} from '~/composables/user/use-user-call-logs-page'

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
const columnVisibility = ref<Record<string, boolean>>({})

interface ToggleableColumn {
  id: string
  header: string
}

function readToggleableColumn(column: TableColumn<UserCallLogRow>): ToggleableColumn | undefined {
  const header = 'header' in column && typeof column.header === 'string' ? column.header : ''
  if (!header) return undefined

  const id = 'id' in column && typeof column.id === 'string'
    ? column.id
    : 'accessorKey' in column
      ? String(column.accessorKey)
      : ''
  if (!id) return undefined

  return { id, header }
}

const columnVisibilityItems = computed<DropdownMenuItem[]>(() =>
  columns
    .map(readToggleableColumn)
    .filter((column): column is ToggleableColumn => column != null)
    .map(column => ({
      label: column.header,
      type: 'checkbox' as const,
      checked: columnVisibility.value[column.id] !== false,
      onUpdateChecked(checked: boolean) {
        columnVisibility.value = { ...columnVisibility.value, [column.id]: checked }
      },
      onSelect(event: Event) {
        event.preventDefault()
      }
    }))
)

onMounted(() => {
  void loadFilterOptions()
})

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
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="dashboard-section-page space-y-6">
        <div class="flex flex-wrap items-center gap-2">
          <UInput
            v-model="filters.keyword"
            icon="i-mdi-magnify"
            placeholder="搜索接口、Key、状态码..."
            class="w-full sm:w-72"
            @keyup.enter="applyFilters"
          />
          <AdminFilterPopover
            :active-count="activeFilterCount"
            @apply="applyFilters"
            @reset="resetFilters"
          >
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
          </AdminFilterPopover>

          <div class="ml-auto flex flex-wrap items-center gap-2">
            <UDropdownMenu
              :items="columnVisibilityItems"
              :content="{ align: 'end' }"
            >
              <UButton
                label="显示列"
                color="neutral"
                variant="outline"
                icon="i-mdi-view-column-outline"
              />
            </UDropdownMenu>
          </div>
        </div>

        <DashboardTableCard
          title="调用明细"
          icon="i-mdi-text-box-search-outline"
          :total="total"
        >
          <DashboardDataTable
            v-model:page="page"
            v-model:page-size="pageSize"
            v-model:column-visibility="columnVisibility"
            :data="items"
            :columns="columns"
            :loading="loading"
            :total="total"
            :page-size-items="PAGE_SIZE_ITEMS"
            empty-title="暂无调用记录"
            empty-icon="i-mdi-text-box-search-outline"
          >
            <template #createdAt-cell="{ row }">
              <div class="flex flex-col gap-1 min-w-[150px]">
                <span class="text-xs whitespace-nowrap">
                  {{ formatDateTime(row.original.createdAt) }}
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
