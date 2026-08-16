<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPlatformContext } from '~/composables/admin/use-admin-platform-context'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import type { PlatformUpstream } from '~/types/platform'
import { parseFetchError } from '~/utils/client-error'
import { platformStatusColor } from '~/utils/platform-display'

const { t } = useI18n()
const context = useAdminPlatformContext()
const modalOpen = ref(false)

useHead({ title: () => t('admin.apis.routing.sections.upstreamsTitle') })

const resource = usePrivateResource<PlatformUpstream[]>({
  path: '/api/admin/v1/upstreams',
  defaultData: () => [],
  immediate: false,
  query: () => context.selectedWorkspaceId.value
    ? { workspaceId: context.selectedWorkspaceId.value }
    : undefined
})
const upstreams = computed(() => resource.data.value.filter(
  upstream => upstream.workspaceId === context.selectedWorkspaceId.value
))

watch(context.selectedWorkspaceId, (workspaceId) => {
  if (workspaceId) void resource.refresh()
}, { immediate: true })

function upstreamKindLabel(upstream: PlatformUpstream): string {
  return t(`admin.apis.routing.upstreamKinds.${upstream.kind}`)
}

function loadBalancingLabel(upstream: PlatformUpstream): string {
  return t(`admin.apis.routing.loadBalancing.${upstream.loadBalancing === 'weighted' ? 'weighted' : 'roundRobin'}`)
}

const columns = computed<TableColumn<PlatformUpstream>[]>(() => [
  { id: 'upstream', header: t('admin.apis.routing.columns.upstream') },
  { id: 'kind', header: t('admin.apis.routing.columns.kind') },
  { id: 'targets', header: t('admin.apis.routing.columns.targets') },
  { id: 'loadBalancing', header: t('admin.apis.routing.columns.loadBalancing') },
  { id: 'status', header: t('admin.apis.routing.columns.state') },
  { id: 'actions', header: '' }
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ $t('admin.apis.routing.sections.upstreamsTitle') }}
        </h1>
        <p class="mt-2 text-sm leading-6 text-muted">
          {{ $t('admin.apis.routing.sections.upstreamsDescription') }}
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
        <UButton
          icon="i-lucide-plus"
          :disabled="!context.selectedWorkspace.value"
          @click="modalOpen = true"
        >
          {{ $t('admin.apis.routing.actions.createUpstream') }}
        </UButton>
      </div>
    </div>

    <AdminPlatformContextBar :show-environment="false" />

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-network"
      :title="$t('admin.apis.routing.upstreamForm.multiServiceTitle')"
      :description="$t('admin.apis.routing.upstreamForm.multiServiceDescription')"
    />

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
      :title="$t('admin.apis.routing.sections.upstreamsTitle')"
      :description="$t('admin.apis.routing.sections.upstreamsDescription')"
      :total="upstreams.length"
      icon="i-lucide-server-cog"
    >
      <DashboardDataTable
        :data="upstreams"
        :columns="columns"
        :loading="resource.loading.value"
        :fixed="false"
        :empty-title="$t('admin.apis.routing.empty.upstreamsTitle')"
        :empty-description="$t('admin.apis.routing.empty.upstreamsDescription')"
        empty-icon="i-lucide-server-off"
      >
        <template #upstream-cell="{ row }">
          <div class="min-w-48">
            <p class="text-sm font-semibold text-highlighted">
              {{ row.original.name }}
            </p>
            <p class="font-mono text-xs text-muted">
              {{ row.original.slug }}
            </p>
            <UBadge
              v-if="row.original.kind === 'internal'"
              class="mt-2"
              :color="row.original.connection?.connected ? 'success' : 'warning'"
              variant="subtle"
              size="sm"
            >
              {{ row.original.connection?.connected
                ? $t('admin.apis.routing.serviceControl.connected')
                : $t('admin.apis.routing.serviceControl.notDiscovered') }}
            </UBadge>
          </div>
        </template>
        <template #kind-cell="{ row }">
          <UBadge
            :color="row.original.kind === 'internal' ? 'info' : 'warning'"
            variant="subtle"
          >
            {{ upstreamKindLabel(row.original) }}
          </UBadge>
        </template>
        <template #targets-cell="{ row }">
          <div class="min-w-72 space-y-1.5">
            <div
              v-for="target in row.original.targets"
              :key="target.id"
              class="flex items-center gap-2"
            >
              <span class="min-w-0 truncate font-mono text-xs text-highlighted">
                {{ target.baseUrl }}
              </span>
              <UBadge
                v-if="row.original.loadBalancing === 'weighted'"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                {{ target.weight }}
              </UBadge>
            </div>
          </div>
        </template>
        <template #loadBalancing-cell="{ row }">
          <span class="text-xs text-toned">{{ loadBalancingLabel(row.original) }}</span>
        </template>
        <template #status-cell="{ row }">
          <UBadge :color="platformStatusColor(row.original.status)" variant="subtle">
            {{ $t(`admin.apis.routing.serviceStatuses.${row.original.status}`) }}
          </UBadge>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              v-if="row.original.kind === 'internal'"
              :to="`/admin/apis/upstreams/${row.original.id}`"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-settings-2"
            >
              {{ $t('admin.apis.routing.serviceControl.manage') }}
            </UButton>
          </div>
        </template>
        <template #empty-actions>
          <UButton
            size="sm"
            icon="i-lucide-plus"
            :disabled="!context.selectedWorkspace.value"
            @click="modalOpen = true"
          >
            {{ $t('admin.apis.routing.actions.createUpstream') }}
          </UButton>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>

    <AdminPlatformUpstreamModal
      v-if="context.selectedWorkspace.value"
      v-model:open="modalOpen"
      :workspace="context.selectedWorkspace.value"
      @saved="resource.refresh"
    />
  </div>
</template>
