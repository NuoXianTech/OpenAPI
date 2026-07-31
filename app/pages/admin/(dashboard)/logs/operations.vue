<script setup lang="ts">
import AdminOperationResourceSummary from '~/components/admin/AdminOperationResourceSummary.vue'
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { useAdminOperationLogList } from '~/composables/admin/use-admin-call-logs-page'
import { adminModalUi } from '~/utils/admin-modal-ui'

const { t, locale } = useI18n()
useHead({ title: () => t('admin.logs.operations.title') })
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
    <section class="dashboard-hero-surface relative overflow-hidden rounded-lg border border-default p-5 sm:p-6">
      <div class="relative z-10 space-y-3">
        <div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
            {{ $t('admin.logs.operations.title') }}
          </h2>
          <p class="mt-1 text-sm text-toned">
            {{ $t('admin.logs.operations.description') }}
          </p>
        </div>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <AdminFilterPopover
        :active-count="activeFilterCount"
        :title="$t('admin.logs.operations.filterTitle')"
        panel-class="w-[min(calc(100vw-2rem),42rem)] p-3"
        @apply="applyFilters"
        @reset="reset"
      >
        <div class="grid gap-3 md:grid-cols-2">
          <UFormField
            :label="$t('admin.logs.operations.filters.timeRange')"
            class="md:col-span-2"
          >
            <CommonDateRangePicker
              v-model:start="filters.startAt"
              v-model:end="filters.endAt"
              :placeholder="$t('admin.logs.operations.filters.allTime')"
            />
          </UFormField>
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
      <UButton
        class="ml-auto"
        icon="i-mdi-refresh"
        color="neutral"
        variant="outline"
        :loading="loading"
        @click="refresh"
      >
        {{ $t('common.actions.refresh') }}
      </UButton>
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
          <div class="grid grid-cols-2 gap-3">
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
            <div class="col-span-2">
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
  </div>
</template>
