<script setup lang="ts">
import { useAdminPlatformContext } from '~/composables/admin/use-admin-platform-context'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import type {
  PlatformEndpointCatalog,
  PlatformEndpointCatalogItem,
  PlatformEndpointPublicationResult,
  PlatformEndpointCatalogService,
  PlatformProduct,
  PlatformRouteBinding
} from '~/types/platform'
import { parseFetchError } from '~/utils/client-error'
import {
  platformStatusColor,
  serviceAvailabilityColor
} from '~/utils/platform-display'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const context = useAdminPlatformContext()

useHead({ title: () => t('admin.apis.routing.catalog.title') })

const emptyCatalog = (): PlatformEndpointCatalog => ({
  workspaceId: '',
  environmentId: '',
  activeRevisionId: null,
  activeRevisionSequence: null,
  services: [],
  totals: {
    discovered: 0,
    live: 0,
    available: 0,
    pending: 0,
    disabled: 0
  }
})
const catalogResource = usePrivateResource<PlatformEndpointCatalog>({
  path: '/api/admin/v1/service-endpoints',
  defaultData: emptyCatalog,
  immediate: false,
  query: () => (
    context.selectedWorkspaceId.value
    && context.selectedEnvironmentId.value
      ? {
          workspaceId: context.selectedWorkspaceId.value,
          environmentId: context.selectedEnvironmentId.value
        }
      : undefined
  )
})
const productsResource = usePrivateResource<PlatformProduct[]>({
  path: '/api/admin/v1/products',
  defaultData: () => [],
  immediate: false,
  query: () => context.selectedWorkspaceId.value
    ? { workspaceId: context.selectedWorkspaceId.value }
    : undefined
})
const search = ref('')
const statusFilter = ref('all')
const busyKeys = ref(new Set<string>())
const routeModalOpen = ref(false)
const editingRoute = ref<PlatformRouteBinding | null>(null)

const products = computed(() => productsResource.data.value.filter(
  product => product.workspaceId === context.selectedWorkspaceId.value
))
const upstreams = computed(() => (
  catalogResource.data.value.services
    .map(service => service.upstream)
    .filter(
      upstream => upstream.workspaceId === context.selectedWorkspaceId.value
    )
))
const internalUpstreams = computed(() => upstreams.value.filter(
  upstream => upstream.kind === 'internal' && upstream.status === 'active'
))
const loading = computed(() => (
  catalogResource.loading.value
  || productsResource.loading.value
))
const resourceError = computed(() => (
  catalogResource.error.value
  || productsResource.error.value
))
const focusedUpstreamId = computed(() => (
  typeof route.query.upstreamId === 'string' ? route.query.upstreamId : ''
))
const statusItems = computed(() => [
  { label: t('admin.apis.routing.catalog.filters.all'), value: 'all' },
  { label: t('admin.apis.routing.catalog.filters.live'), value: 'live' },
  { label: t('admin.apis.routing.catalog.filters.available'), value: 'available' },
  { label: t('admin.apis.routing.catalog.filters.attention'), value: 'attention' },
  { label: t('admin.apis.routing.catalog.filters.disabled'), value: 'disabled' }
])

const visibleServices = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  return catalogResource.data.value.services
    .filter(service => (
      !focusedUpstreamId.value || service.upstream.id === focusedUpstreamId.value
    ))
    .map((service) => {
      const endpoints = service.endpoints.filter((item) => {
        const matchesStatus = statusFilter.value === 'all'
          || item.status === statusFilter.value
          || (statusFilter.value === 'attention'
            && (item.status === 'pending'
              || item.status === 'retiring'
              || item.sourceKind === 'missing'))
        if (!matchesStatus) return false
        if (!keyword) return true
        return [
          service.upstream.name,
          service.upstream.connection?.serviceName,
          item.endpoint?.method,
          item.endpoint?.path,
          item.endpoint?.summary,
          item.endpoint?.operationId,
          item.route?.route.name,
          item.route?.route.pathPattern,
          item.route?.route.upstreamPathTemplate
        ].some(value => value?.toLocaleLowerCase().includes(keyword))
      })
      return { ...service, endpoints }
    })
    .filter(service => (
      service.endpoints.length > 0
      || (!search.value && statusFilter.value === 'all')
    ))
})

watch(
  [context.selectedWorkspaceId, context.selectedEnvironmentId],
  ([workspaceId, environmentId]) => {
    if (workspaceId && environmentId) void refresh()
  },
  { immediate: true }
)

watch(routeModalOpen, (open) => {
  if (!open) editingRoute.value = null
})

function setBusy(key: string, value: boolean) {
  const next = new Set(busyKeys.value)
  if (value) next.add(key)
  else next.delete(key)
  busyKeys.value = next
}

function isBusy(key: string) {
  return busyKeys.value.has(key)
}

function showPublicationResult(
  result: PlatformEndpointPublicationResult,
  successKey: string
) {
  if (result.applied) {
    toast.add({
      title: t(successKey),
      description: t('admin.apis.routing.feedback.runtimeUpdated'),
      color: 'success',
      icon: 'i-lucide-circle-check'
    })
    return
  }
  toast.add({
    title: t('admin.apis.routing.catalog.feedback.savedPending'),
    description: t(
      'admin.apis.routing.catalog.feedback.savedPendingDescription',
      { reason: result.publicationError?.message ?? '—' }
    ),
    color: 'warning',
    icon: 'i-lucide-triangle-alert'
  })
}

async function refresh() {
  if (!context.selectedWorkspaceId.value
    || !context.selectedEnvironmentId.value) return
  await Promise.all([
    catalogResource.refresh(),
    productsResource.refresh()
  ])
}

async function refreshAfterMutation() {
  await Promise.all([
    context.refresh(),
    catalogResource.refresh(),
    productsResource.refresh()
  ])
}

async function discoverService(upstreamId: string, quiet = false) {
  const key = `discover:${upstreamId}`
  setBusy(key, true)
  try {
    await $fetch(`/api/admin/v1/upstreams/${upstreamId}/discover`, {
      method: 'POST'
    })
    if (!quiet) {
      toast.add({
        title: t('admin.apis.routing.catalog.feedback.serviceDiscovered'),
        color: 'success'
      })
      await refresh()
    }
    return true
  } catch (error: unknown) {
    if (!quiet) {
      toast.add({
        title: parseFetchError(
          error,
          t('admin.apis.routing.serviceControl.discoveryFailed')
        ),
        color: 'error'
      })
      await refresh()
    }
    return false
  } finally {
    setBusy(key, false)
  }
}

async function discoverAllServices() {
  if (internalUpstreams.value.length === 0) return
  const key = 'discover:all'
  setBusy(key, true)
  try {
    const results = await Promise.all(
      internalUpstreams.value.map(upstream => discoverService(upstream.id, true))
    )
    await refresh()
    const succeeded = results.filter(Boolean).length
    const failed = results.length - succeeded
    toast.add({
      title: t('admin.apis.routing.catalog.feedback.discoveryCompleted', {
        succeeded,
        failed
      }),
      color: failed > 0 ? 'warning' : 'success'
    })
  } finally {
    setBusy(key, false)
  }
}

async function publishEndpoint(
  service: PlatformEndpointCatalogService,
  item: PlatformEndpointCatalogItem
) {
  const environmentId = context.selectedEnvironmentId.value
  if (!environmentId || !item.endpoint) return
  const key = `endpoint:${item.key}`
  setBusy(key, true)
  try {
    const result = await $fetch<PlatformEndpointPublicationResult>(
      '/api/admin/v1/service-endpoints/publish',
      {
        method: 'POST',
        body: {
          environmentId,
          upstreamServiceId: service.upstream.id,
          method: item.endpoint.method,
          path: item.endpoint.path
        }
      }
    )
    showPublicationResult(
      result,
      'admin.apis.routing.catalog.feedback.published'
    )
    await refreshAfterMutation()
  } catch (error: unknown) {
    toast.add({
      title: parseFetchError(
        error,
        t('admin.apis.routing.catalog.feedback.publishFailed')
      ),
      color: 'error'
    })
    await catalogResource.refresh()
  } finally {
    setBusy(key, false)
  }
}

async function updatePublication(
  item: PlatformEndpointCatalogItem,
  patch: Record<string, unknown>,
  successKey: string
) {
  const environmentId = context.selectedEnvironmentId.value
  const routeId = item.route?.route.id
  if (!environmentId || !routeId) return
  const key = `endpoint:${item.key}`
  setBusy(key, true)
  try {
    const result = await $fetch<PlatformEndpointPublicationResult>(
      `/api/admin/v1/service-endpoints/${routeId}`,
      {
        method: 'PATCH',
        body: { environmentId, ...patch }
      }
    )
    showPublicationResult(result, successKey)
    await refreshAfterMutation()
  } catch (error: unknown) {
    toast.add({
      title: parseFetchError(
        error,
        t('admin.apis.routing.catalog.feedback.updateFailed')
      ),
      color: 'error'
    })
    await catalogResource.refresh()
  } finally {
    setBusy(key, false)
  }
}

async function handlePrimaryAction(
  service: PlatformEndpointCatalogService,
  item: PlatformEndpointCatalogItem
) {
  if (!item.route) {
    await publishEndpoint(service, item)
    return
  }
  if (item.status === 'pending' || item.status === 'retiring') {
    await updatePublication(
      item,
      {},
      'admin.apis.routing.catalog.feedback.changesApplied'
    )
    return
  }
  const enabled = item.status !== 'live'
  await updatePublication(
    item,
    { enabled },
    enabled
      ? 'admin.apis.routing.catalog.feedback.published'
      : 'admin.apis.routing.catalog.feedback.unpublished'
  )
}

function openCreateRoute() {
  editingRoute.value = null
  routeModalOpen.value = true
}

function openEditRoute(item: PlatformEndpointCatalogItem) {
  if (!item.route) return
  editingRoute.value = item.route
  routeModalOpen.value = true
}

function clearFocusedService() {
  const query = { ...route.query }
  delete query.upstreamId
  void router.replace({ query })
}

function serviceName(service: PlatformEndpointCatalogService) {
  return service.upstream.connection?.serviceName ?? service.upstream.name
}

function serviceStateColor(service: PlatformEndpointCatalogService) {
  const upstream = service.upstream
  if (upstream.status !== 'active' || upstream.kind === 'external') {
    return platformStatusColor(upstream.status)
  }
  if (!upstream.connection?.discovered) return 'warning' as const
  return serviceAvailabilityColor(upstream.connection.availability)
}

function serviceStateLabel(service: PlatformEndpointCatalogService) {
  const upstream = service.upstream
  if (upstream.status !== 'active') {
    return t(`admin.apis.routing.serviceStatuses.${upstream.status}`)
  }
  if (upstream.kind === 'external') {
    return t('admin.apis.routing.serviceControl.enabled')
  }
  if (!upstream.connection?.discovered) {
    return t('admin.apis.routing.serviceControl.notDiscovered')
  }
  return t(
    `admin.apis.routing.serviceControl.availability.${upstream.connection.availability}`
  )
}

function itemMethod(item: PlatformEndpointCatalogItem) {
  return item.endpoint?.method ?? item.route?.route.method ?? 'GET'
}

function sourcePath(item: PlatformEndpointCatalogItem) {
  return item.endpoint?.path ?? item.route?.route.upstreamPathTemplate ?? '—'
}

function publicPath(item: PlatformEndpointCatalogItem) {
  return item.route?.route.pathPattern ?? item.endpoint?.path ?? '—'
}

function itemSummary(item: PlatformEndpointCatalogItem) {
  if (item.sourceKind === 'missing') {
    return t('admin.apis.routing.catalog.contractMissing')
  }
  if (item.sourceKind === 'manual') {
    return item.route?.route.name
      ?? t('admin.apis.routing.catalog.manualRoute')
  }
  return item.endpoint?.summary
    ?? item.endpoint?.operationId
    ?? item.route?.route.name
    ?? '—'
}

function statusColor(status: PlatformEndpointCatalogItem['status']) {
  if (status === 'live') return 'success' as const
  if (status === 'pending' || status === 'retiring') return 'warning' as const
  if (status === 'available') return 'info' as const
  return 'neutral' as const
}

function primaryActionLabel(item: PlatformEndpointCatalogItem) {
  if (item.status === 'live') return t('admin.apis.routing.catalog.actions.unpublish')
  if (item.status === 'pending') return t('admin.apis.routing.catalog.actions.applyChanges')
  if (item.status === 'retiring') return t('admin.apis.routing.catalog.actions.finishUnpublish')
  return t('admin.apis.routing.catalog.actions.publish')
}

function primaryActionIcon(item: PlatformEndpointCatalogItem) {
  if (item.status === 'live') return 'i-lucide-power'
  if (item.status === 'pending' || item.status === 'retiring') {
    return 'i-lucide-refresh-cw'
  }
  return 'i-lucide-rocket'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <div class="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
          <UIcon name="i-lucide-waypoints" class="size-4" />
          <span>{{ $t('admin.apis.routing.catalog.eyebrow') }}</span>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ $t('admin.apis.routing.catalog.title') }}
        </h1>
        <p class="mt-2 text-sm leading-6 text-muted">
          {{ $t('admin.apis.routing.catalog.description') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-plus"
          :disabled="!context.selectedEnvironment.value || products.length === 0 || upstreams.length === 0"
          @click="openCreateRoute"
        >
          {{ $t('admin.apis.routing.catalog.actions.manualRoute') }}
        </UButton>
        <UButton
          icon="i-lucide-scan-search"
          :loading="isBusy('discover:all')"
          :disabled="internalUpstreams.length === 0"
          @click="discoverAllServices"
        >
          {{ $t('admin.apis.routing.catalog.actions.syncServices') }}
        </UButton>
      </div>
    </div>

    <AdminPlatformContextBar>
      <UButton
        to="/admin/apis/revisions"
        color="neutral"
        variant="ghost"
        icon="i-lucide-history"
      >
        {{ $t('admin.apis.routing.sections.revisionsTitle') }}
      </UButton>
    </AdminPlatformContextBar>

    <UAlert
      v-if="resourceError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="$t('common.feedback.loadFailed')"
      :description="parseFetchError(resourceError, $t('common.feedback.loadFailed'))"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="xs"
          @click="refresh"
        >
          {{ $t('common.actions.retry') }}
        </UButton>
      </template>
    </UAlert>

    <div
      class="grid overflow-hidden rounded-xl border border-default bg-default sm:grid-cols-2 xl:grid-cols-4"
    >
      <div class="border-b border-default px-5 py-4 sm:border-e xl:border-b-0">
        <p class="text-xs font-medium text-muted">
          {{ $t('admin.apis.routing.catalog.metrics.discovered') }}
        </p>
        <p class="mt-1 font-mono text-2xl font-semibold text-highlighted">
          {{ catalogResource.data.value.totals.discovered }}
        </p>
      </div>
      <div class="border-b border-default px-5 py-4 xl:border-e xl:border-b-0">
        <p class="text-xs font-medium text-muted">
          {{ $t('admin.apis.routing.catalog.metrics.live') }}
        </p>
        <p class="mt-1 font-mono text-2xl font-semibold text-success">
          {{ catalogResource.data.value.totals.live }}
        </p>
      </div>
      <div class="border-b border-default px-5 py-4 sm:border-e sm:border-b-0">
        <p class="text-xs font-medium text-muted">
          {{ $t('admin.apis.routing.catalog.metrics.available') }}
        </p>
        <p class="mt-1 font-mono text-2xl font-semibold text-highlighted">
          {{ catalogResource.data.value.totals.available }}
        </p>
      </div>
      <div class="px-5 py-4">
        <p class="text-xs font-medium text-muted">
          {{ $t('admin.apis.routing.catalog.metrics.pending') }}
        </p>
        <p
          class="mt-1 font-mono text-2xl font-semibold"
          :class="catalogResource.data.value.totals.pending > 0 ? 'text-warning' : 'text-highlighted'"
        >
          {{ catalogResource.data.value.totals.pending }}
        </p>
      </div>
    </div>

    <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated/30 p-3 sm:flex-row sm:items-center">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="$t('admin.apis.routing.catalog.searchPlaceholder')"
        class="min-w-0 flex-1"
      />
      <USelect
        v-model="statusFilter"
        :items="statusItems"
        value-key="value"
        class="w-full sm:w-44"
      />
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        :loading="loading"
        @click="refresh"
      >
        {{ $t('common.actions.refresh') }}
      </UButton>
      <UButton
        v-if="focusedUpstreamId"
        color="neutral"
        variant="soft"
        icon="i-lucide-x"
        @click="clearFocusedService"
      >
        {{ $t('admin.apis.routing.catalog.actions.showAllServices') }}
      </UButton>
    </div>

    <div v-if="loading && catalogResource.data.value.services.length === 0" class="space-y-4">
      <USkeleton v-for="index in 2" :key="index" class="h-56 rounded-xl" />
    </div>

    <div v-else-if="visibleServices.length" class="space-y-4">
      <UCard
        v-for="service in visibleServices"
        :key="service.upstream.id"
        variant="subtle"
        :ui="{ body: 'p-0 sm:p-0' }"
      >
        <template #header>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex min-w-0 items-center gap-3">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon
                  :name="service.upstream.kind === 'internal' ? 'i-lucide-server' : 'i-lucide-globe-2'"
                  class="size-5"
                />
              </div>
              <div class="min-w-0">
                <h2 class="truncate text-base font-semibold text-highlighted">
                  {{ serviceName(service) }}
                </h2>
                <p class="mt-1 truncate font-mono text-xs text-muted">
                  {{ service.upstream.connection?.serviceId || service.upstream.slug }}
                  <template v-if="service.upstream.connection?.serviceVersion">
                    · {{ service.upstream.connection.serviceVersion }}
                  </template>
                  · {{ $t('admin.apis.routing.catalog.endpointCount', { count: service.endpoints.length }) }}
                </p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:justify-end">
              <UBadge
                :color="serviceStateColor(service)"
                variant="subtle"
                size="sm"
              >
                {{ serviceStateLabel(service) }}
              </UBadge>
              <UButton
                v-if="service.upstream.kind === 'internal'"
                :to="{ path: `/admin/apis/upstreams/${service.upstream.id}`, query: route.query }"
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-sliders-horizontal"
              >
                {{ $t('admin.apis.routing.catalog.actions.serviceSettings') }}
              </UButton>
              <UButton
                v-if="service.upstream.kind === 'internal'"
                color="neutral"
                variant="soft"
                size="sm"
                icon="i-lucide-scan-search"
                :loading="isBusy(`discover:${service.upstream.id}`)"
                @click="discoverService(service.upstream.id)"
              >
                {{ $t('admin.apis.routing.catalog.actions.rediscover') }}
              </UButton>
            </div>
          </div>
        </template>

        <div v-if="service.endpoints.length" class="divide-y divide-default">
          <div
            v-for="item in service.endpoints"
            :key="item.key"
            class="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] lg:items-center sm:px-5"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <ApiHttpMethodBadge :method="itemMethod(item)" size="xs" />
                <code class="truncate text-xs font-semibold text-highlighted">
                  {{ sourcePath(item) }}
                </code>
              </div>
              <p class="mt-1.5 truncate text-xs text-muted">
                {{ itemSummary(item) }}
              </p>
            </div>

            <div class="hidden items-center gap-2 text-dimmed lg:flex" aria-hidden="true">
              <span class="w-8 border-t border-dashed border-default" />
              <UIcon name="i-lucide-arrow-right" class="size-4" />
            </div>

            <div class="min-w-0 rounded-lg border border-default bg-default px-3 py-2.5">
              <div class="flex items-center gap-2">
                <UIcon
                  :name="item.status === 'live' ? 'i-lucide-radio-tower' : 'i-lucide-route'"
                  class="size-4 shrink-0"
                  :class="item.status === 'live' ? 'text-success' : 'text-muted'"
                />
                <code class="min-w-0 flex-1 truncate text-xs font-semibold text-highlighted">
                  {{ publicPath(item) }}
                </code>
                <UBadge :color="statusColor(item.status)" variant="subtle" size="sm">
                  {{ $t(`admin.apis.routing.catalog.statuses.${item.status}`) }}
                </UBadge>
              </div>
              <div v-if="item.route" class="mt-2 flex flex-wrap items-center gap-1.5">
                <UButton
                  size="xs"
                  :color="item.route.route.isStatistics ? 'primary' : 'neutral'"
                  variant="soft"
                  icon="i-lucide-chart-no-axes-column"
                  :disabled="item.route.route.creditsCost > 0 || isBusy(`endpoint:${item.key}`)"
                  @click="updatePublication(
                    item,
                    { isStatistics: !item.route!.route.isStatistics },
                    item.route!.route.isStatistics
                      ? 'admin.apis.routing.catalog.feedback.statisticsDisabled'
                      : 'admin.apis.routing.catalog.feedback.statisticsEnabled'
                  )"
                >
                  {{ $t('admin.apis.routing.catalog.actions.statistics') }}
                </UButton>
                <UButton
                  size="xs"
                  :color="item.route.route.isApiKey ? 'primary' : 'neutral'"
                  variant="soft"
                  icon="i-lucide-key-round"
                  :disabled="item.route.route.creditsCost > 0 || isBusy(`endpoint:${item.key}`)"
                  @click="updatePublication(
                    item,
                    { isApiKey: !item.route!.route.isApiKey },
                    item.route!.route.isApiKey
                      ? 'admin.apis.routing.catalog.feedback.apiKeyDisabled'
                      : 'admin.apis.routing.catalog.feedback.apiKeyEnabled'
                  )"
                >
                  API Key
                </UButton>
                <UBadge
                  v-if="item.route.route.creditsCost > 0"
                  color="warning"
                  variant="subtle"
                  size="sm"
                >
                  {{ $t('admin.apis.routing.catalog.credits', {
                    value: item.route.route.creditsCost
                  }) }}
                </UBadge>
              </div>
            </div>

            <div class="flex items-center justify-end gap-1.5">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-settings-2"
                :disabled="!item.route || isBusy(`endpoint:${item.key}`)"
                :aria-label="$t('admin.apis.routing.catalog.actions.advancedSettings')"
                @click="openEditRoute(item)"
              />
              <UButton
                size="sm"
                :color="item.status === 'live' ? 'neutral' : item.status === 'pending' || item.status === 'retiring' ? 'warning' : 'primary'"
                :variant="item.status === 'live' ? 'outline' : 'solid'"
                :icon="primaryActionIcon(item)"
                :loading="isBusy(`endpoint:${item.key}`)"
                :disabled="!item.publishable || !context.selectedEnvironment.value"
                @click="handlePrimaryAction(service, item)"
              >
                {{ primaryActionLabel(item) }}
              </UButton>
            </div>
          </div>
        </div>

        <div v-else class="px-5 py-8">
          <UEmpty
            :icon="service.upstream.kind === 'internal' ? 'i-lucide-file-search' : 'i-lucide-route-off'"
            :title="service.upstream.kind === 'internal'
              ? $t('admin.apis.routing.catalog.empty.serviceTitle')
              : $t('admin.apis.routing.catalog.empty.externalTitle')"
            :description="service.upstream.kind === 'internal'
              ? $t('admin.apis.routing.catalog.empty.serviceDescription')
              : $t('admin.apis.routing.catalog.empty.externalDescription')"
          >
            <template #actions>
              <UButton
                v-if="service.upstream.kind === 'internal'"
                size="sm"
                icon="i-lucide-scan-search"
                :loading="isBusy(`discover:${service.upstream.id}`)"
                @click="discoverService(service.upstream.id)"
              >
                {{ $t('admin.apis.routing.catalog.actions.rediscover') }}
              </UButton>
              <UButton
                v-else
                size="sm"
                icon="i-lucide-plus"
                @click="openCreateRoute"
              >
                {{ $t('admin.apis.routing.catalog.actions.manualRoute') }}
              </UButton>
            </template>
          </UEmpty>
        </div>
      </UCard>
    </div>

    <UEmpty
      v-else
      icon="i-lucide-waypoints"
      :title="catalogResource.data.value.services.length === 0
        ? $t('admin.apis.routing.catalog.empty.catalogTitle')
        : $t('admin.apis.routing.catalog.empty.filterTitle')"
      :description="catalogResource.data.value.services.length === 0
        ? $t('admin.apis.routing.catalog.empty.catalogDescription')
        : $t('admin.apis.routing.catalog.empty.filterDescription')"
    >
      <template #actions>
        <UButton
          v-if="catalogResource.data.value.services.length === 0"
          to="/admin/apis/upstreams"
          icon="i-lucide-server-cog"
        >
          {{ $t('admin.apis.routing.actions.createUpstream') }}
        </UButton>
        <UButton
          v-else
          color="neutral"
          variant="outline"
          @click="search = ''; statusFilter = 'all'"
        >
          {{ $t('admin.apis.routing.catalog.actions.clearFilters') }}
        </UButton>
      </template>
    </UEmpty>

    <AdminPlatformRouteModal
      v-if="context.selectedWorkspace.value"
      v-model:open="routeModalOpen"
      :workspace="context.selectedWorkspace.value"
      :products="products"
      :upstreams="upstreams"
      :route-binding="editingRoute"
      :environment-id="context.selectedEnvironmentId.value || undefined"
      @saved="refreshAfterMutation"
    />
  </div>
</template>
