<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPlatformContext } from '~/composables/admin/use-admin-platform-context'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import type { PlatformRoutingRevision } from '#shared/types/platform'
import { parseFetchError } from '~/utils/client-error'
import { formatPlatformDate } from '~/utils/platform-display'

const { t, locale } = useI18n()
const toast = useToast()
const confirm = useConfirmDialog()
const context = useAdminPlatformContext()

useHead({ title: () => t('admin.apis.routing.sections.revisionsTitle') })

const resource = usePrivateResource<PlatformRoutingRevision[]>({
  path: '/api/admin/v1/revisions',
  defaultData: () => [],
  immediate: false,
  query: () => context.selectedEnvironmentId.value
    ? { environmentId: context.selectedEnvironmentId.value }
    : undefined
})
const revisions = computed(() => resource.data.value.filter(
  revision => revision.environmentId === context.selectedEnvironmentId.value
))

watch(context.selectedEnvironmentId, (environmentId) => {
  if (environmentId) void resource.refresh()
}, { immediate: true })

function revisionStatusLabel(revision: PlatformRoutingRevision): string {
  if (revision.id === context.selectedEnvironment.value?.activeRevisionId) {
    return t('admin.apis.routing.revisionStatuses.active')
  }
  return t('admin.apis.routing.revisionStatuses.historical')
}

async function activateRevision(revision: PlatformRoutingRevision) {
  const environment = context.selectedEnvironment.value
  if (!environment || revision.id === environment.activeRevisionId) return

  await confirm({
    title: t('admin.apis.routing.rollback.title', { sequence: revision.sequence }),
    description: t('admin.apis.routing.rollback.description', { environment: environment.name }),
    confirmLabel: t('admin.apis.routing.actions.activateRevision'),
    confirmColor: 'warning',
    onConfirm: async () => {
      try {
        await $fetch('/api/admin/v1/revisions/activate', {
          method: 'POST',
          body: { environmentId: environment.id, revisionId: revision.id }
        })
        toast.add({
          title: t('admin.apis.routing.feedback.revisionActivated', { sequence: revision.sequence }),
          color: 'success'
        })
        await Promise.all([context.refresh(), resource.refresh()])
      } catch (error: unknown) {
        toast.add({
          title: parseFetchError(error, t('admin.apis.routing.feedback.activateFailed')),
          color: 'error'
        })
        throw error
      }
    }
  })
}

const columns = computed<TableColumn<PlatformRoutingRevision>[]>(() => [
  { id: 'sequence', header: t('admin.apis.routing.columns.revision') },
  { id: 'routes', header: t('admin.apis.routing.columns.routeCount') },
  { id: 'checksum', header: t('admin.apis.routing.columns.checksum') },
  { id: 'publishedAt', header: t('admin.apis.routing.columns.publishedAt') },
  { id: 'status', header: t('admin.apis.routing.columns.state') },
  { id: 'actions', header: '' }
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ $t('admin.apis.routing.sections.revisionsTitle') }}
        </h1>
        <p class="mt-2 text-sm leading-6 text-muted">
          {{ $t('admin.apis.routing.sections.revisionsDescription') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="resource.loading.value"
          @click="resource.refresh"
        >
          {{ $t('common.actions.refresh') }}
        </UButton>
        <UButton to="/admin/apis" icon="i-lucide-waypoints">
          {{ $t('admin.apis.routing.catalog.actions.manageEndpoints') }}
        </UButton>
      </div>
    </div>

    <AdminPlatformContextBar />

    <UAlert
      v-if="resource.error.value"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="$t('common.feedback.loadFailed')"
      :description="parseFetchError(resource.error.value, $t('common.feedback.loadFailed'))"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="xs"
          @click="resource.refresh"
        >
          {{ $t('common.actions.retry') }}
        </UButton>
      </template>
    </UAlert>

    <DashboardTableCard
      :title="$t('admin.apis.routing.sections.revisionsTitle')"
      :description="$t('admin.apis.routing.sections.revisionsDescription')"
      :total="revisions.length"
      icon="i-lucide-history"
    >
      <DashboardDataTable
        :data="revisions"
        :columns="columns"
        :loading="resource.loading.value"
        :fixed="false"
        :empty-title="$t('admin.apis.routing.empty.revisionsTitle')"
        :empty-description="$t('admin.apis.routing.empty.revisionsDescription')"
        empty-icon="i-lucide-history"
      >
        <template #sequence-cell="{ row }">
          <div>
            <p class="font-mono text-sm font-semibold text-highlighted">
              #{{ row.original.sequence }}
            </p>
            <p class="mt-1 font-mono text-[11px] text-muted">
              {{ row.original.id }}
            </p>
          </div>
        </template>
        <template #routes-cell="{ row }">
          {{ row.original.configPayload.routes.length }}
        </template>
        <template #checksum-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{ row.original.checksum.slice(0, 12) }}</span>
        </template>
        <template #publishedAt-cell="{ row }">
          <span class="text-xs text-muted">
            {{ formatPlatformDate(row.original.publishedAt, locale) }}
          </span>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.id === context.selectedEnvironment.value?.activeRevisionId
              ? 'success'
              : 'neutral'"
            variant="subtle"
          >
            {{ revisionStatusLabel(row.original) }}
          </UBadge>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              v-if="row.original.id !== context.selectedEnvironment.value?.activeRevisionId"
              color="warning"
              variant="ghost"
              size="xs"
              icon="i-lucide-rotate-ccw"
              @click="activateRevision(row.original)"
            >
              {{ $t('admin.apis.routing.actions.activateRevision') }}
            </UButton>
          </div>
        </template>
        <template #empty-actions>
          <UButton
            to="/admin/apis"
            size="sm"
            icon="i-lucide-waypoints"
          >
            {{ $t('admin.apis.routing.catalog.actions.manageEndpoints') }}
          </UButton>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>
  </div>
</template>
