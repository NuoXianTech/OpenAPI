<script setup lang="ts">
import AdminOperationResourceSummary from '~/components/admin/AdminOperationResourceSummary.vue'
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { useAdminOperationLogList } from '~/composables/admin/use-admin-operation-logs-page'
import { adminModalUi } from '~/utils/admin-modal-ui'

const { t, locale } = useI18n()
useHead({ title: () => t('admin.logs.operations.title') })
const {
  actorKindItems,
  advancedFilterCount,
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
  resolveActorLabel,
  resolveActionLabel,
  statusItems,
  total,
  cleanupHasFilters,
  cleanupLoading,
  cleanupMatchCount,
  cleanupOpen,
  confirmCleanup,
  openCleanup
} = useAdminOperationLogList()

async function resetAdvancedFilters() {
  filters.userId = ''
  filters.actorKind = 'all'
  filters.actor = ''
  filters.action = ''
  filters.resourceType = ''
  filters.status = 'all'
  await applyFilters()
}
</script>

<template>
  <div class="space-y-6">
    <DashboardPageIntro
      :title="$t('admin.logs.operations.title')"
      :description="$t('admin.logs.operations.description')"
    />

    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="filters.keyword"
        type="search"
        icon="i-mdi-magnify"
        :placeholder="$t('admin.logs.operations.searchPlaceholder')"
        :aria-label="$t('admin.logs.operations.searchPlaceholder')"
        class="w-full sm:w-80"
        @keyup.enter="applyFilters"
      />
      <AdminFilterPopover
        :active-count="advancedFilterCount"
        :title="$t('admin.logs.operations.filterTitle')"
        panel-class="w-[min(calc(100vw-2rem),42rem)] p-3"
        @apply="applyFilters"
        @reset="resetAdvancedFilters"
      >
        <div class="grid gap-3 md:grid-cols-2">
          <UFormField :label="$t('admin.logs.operations.filters.source')">
            <USelect
              v-model="filters.actorKind"
              :items="actorKindItems"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="$t('admin.logs.operations.filters.actor')"
            :hint="$t('admin.logs.operations.filters.actorHint')"
          >
            <UInput
              v-model="filters.actor"
              :placeholder="$t('admin.logs.operations.filters.emptyAll')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.logs.operations.filters.status')">
            <USelect
              v-model="filters.status"
              :items="statusItems"
              class="w-full"
            />
          </UFormField>
          <div class="border-t border-default pt-3 md:col-span-2">
            <p class="mb-3 text-xs font-medium text-muted">
              {{ $t('admin.logs.operations.filters.exact') }}
            </p>
            <div class="grid gap-3 md:grid-cols-3">
              <UFormField :label="$t('admin.logs.operations.filters.userId')">
                <UInput
                  v-model.number="filters.userId"
                  type="number"
                  :placeholder="$t('admin.logs.operations.filters.emptyAll')"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                :label="$t('admin.logs.operations.filters.actionPrefix')"
                :hint="$t('admin.logs.operations.filters.actionPrefixHint')"
              >
                <UInput
                  v-model="filters.action"
                  :placeholder="$t('admin.logs.operations.filters.emptyAll')"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="$t('admin.logs.operations.filters.resourceType')">
                <UInput
                  v-model="filters.resourceType"
                  :placeholder="$t('admin.logs.operations.filters.resourceTypePlaceholder')"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </div>
      </AdminFilterPopover>
      <div class="ml-auto flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
        <CommonDateRangePicker
          v-model:start="filters.startAt"
          v-model:end="filters.endAt"
          :placeholder="$t('admin.logs.operations.filters.allTime')"
          class="w-full sm:w-64"
          @apply="applyFilters"
        />
        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-trash-2"
          :loading="loading && !cleanupOpen"
          :disabled="cleanupLoading"
          @click="openCleanup"
        >
          {{ $t('admin.logs.cleanup.button') }}
        </UButton>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="loading"
          @click="refresh"
        >
          {{ $t('common.actions.refresh') }}
        </UButton>
      </div>
    </div>

    <DashboardTableCard
      :title="$t('admin.logs.operations.detailsTitle')"
      icon="i-mdi-clipboard-text-clock-outline"
    >
      <DashboardDataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        :data="items"
        :columns="columns"
        :loading="loading"
        :total="total"
        :page-size-options="PAGE_SIZE_OPTIONS"
        :empty-title="$t('admin.logs.operations.empty')"
        empty-icon="i-mdi-clipboard-text-clock-outline"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt, '-', locale) }}</span>
        </template>
        <template #actor-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span class="font-medium">{{ row.original.actor || $t('common.identities.anonymous') }}</span>
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
          <AdminOperationResourceSummary
            :resource-type="row.original.resourceType"
            :resource-id="row.original.resourceId"
            :detail="row.original.detail"
          />
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'success' ? 'success' : 'error'"
            variant="subtle"
            size="sm"
          >
            {{ row.original.status === 'success' ? $t('common.states.success') : $t('common.states.failure') }}
          </UBadge>
        </template>
        <template #ip-cell="{ row }">
          <span class="font-mono text-xs text-muted">
            {{ row.original.ip || '-' }}
          </span>
        </template>
        <template #actions-cell="{ row }">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-mdi-eye-outline"
            :aria-label="$t('common.actions.viewDetails')"
            @click="openDetail(row.original)"
          />
        </template>
      </DashboardDataTable>
    </DashboardTableCard>

    <UModal
      v-model:open="detailOpen"
      :title="$t('admin.logs.operations.detail.title')"
      :ui="adminModalUi({ content: 'max-w-2xl' })"
    >
      <template #body>
        <div
          v-if="detailRow"
          class="space-y-4 text-sm"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <div class="text-xs text-muted">
                {{ $t('admin.logs.operations.detail.time') }}
              </div>
              <div>{{ formatDateTime(detailRow.createdAt, '-', locale) }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">
                {{ $t('admin.logs.operations.detail.status') }}
              </div>
              <UBadge
                :color="detailRow.status === 'success' ? 'success' : 'error'"
                variant="subtle"
                size="sm"
                class="w-fit"
              >
                {{ detailRow.status === 'success' ? $t('common.states.success') : $t('common.states.failure') }}
              </UBadge>
            </div>
            <div>
              <div class="text-xs text-muted">
                {{ $t('admin.logs.operations.detail.actor') }}
              </div>
              <div>
                {{ detailRow.actor || $t('common.identities.anonymous') }}
                <span class="text-muted text-xs">
                  · {{ resolveActorLabel(detailRow.action, detailRow.userId, detailRow.actorRole) }}
                </span>
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">
                {{ $t('admin.logs.operations.detail.action') }}
              </div>
              <div>{{ resolveActionLabel(detailRow.action) }}</div>
              <div class="font-mono text-xs text-muted break-all">
                {{ detailRow.action }}
              </div>
            </div>
            <div class="sm:col-span-2">
              <div class="text-xs text-muted">
                {{ $t('admin.logs.operations.detail.resource') }}
              </div>
              <AdminOperationResourceSummary
                class="mt-1"
                :resource-type="detailRow.resourceType"
                :resource-id="detailRow.resourceId"
                :detail="detailRow.detail"
              />
            </div>
          </div>

          <UCard
            :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }"
          >
            <template #header>
              <span class="text-xs font-semibold text-muted">{{ $t('admin.logs.operations.detail.client') }}</span>
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
              <span class="text-xs font-semibold text-muted">{{ $t('admin.logs.operations.detail.payload') }}</span>
            </template>
            <pre class="font-mono text-xs whitespace-pre-wrap break-all">{{ detailJson }}</pre>
          </UCard>
        </div>
      </template>
    </UModal>

    <AdminLogCleanupModal
      v-model:open="cleanupOpen"
      :log-type-label="$t('admin.logs.operations.title')"
      :match-count="cleanupMatchCount"
      :has-filters="cleanupHasFilters"
      :loading="cleanupLoading"
      :note="$t('admin.logs.operations.cleanupNote')"
      :on-confirm="confirmCleanup"
    />
  </div>
</template>
