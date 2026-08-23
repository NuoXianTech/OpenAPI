<script setup lang="ts">
import type {
  PlatformEndpointCatalogItem,
  PlatformEndpointCatalogService
} from '#shared/types/platform'
import {
  platformStatusColor,
  serviceAvailabilityColor
} from '~/utils/platform-display'

const props = defineProps<{
  service: PlatformEndpointCatalogService
  hasEnvironment: boolean
  isBusy: (key: string) => boolean
}>()

const emit = defineEmits<{
  discover: [upstreamId: string]
  edit: [item: PlatformEndpointCatalogItem]
  manual: []
  primary: [
    service: PlatformEndpointCatalogService,
    item: PlatformEndpointCatalogItem
  ]
  update: [
    item: PlatformEndpointCatalogItem,
    patch: Record<string, unknown>,
    successKey: string
  ]
}>()

const { t } = useI18n()
const route = useRoute()

function serviceName() {
  return props.service.upstream.connection?.serviceName
    ?? props.service.upstream.name
}

function serviceStateColor() {
  const upstream = props.service.upstream
  if (upstream.status !== 'active' || !upstream.serviceManaged) {
    return platformStatusColor(upstream.status)
  }
  if (!upstream.connection?.discovered) return 'warning' as const
  return serviceAvailabilityColor(upstream.connection.availability)
}

function serviceStateLabel() {
  const upstream = props.service.upstream
  if (upstream.status !== 'active') {
    return t(`admin.apis.routing.serviceStatuses.${upstream.status}`)
  }
  if (!upstream.serviceManaged) {
    return t('admin.apis.routing.serviceControl.enabled')
  }
  if (!upstream.connection?.discovered) {
    return t('admin.apis.routing.serviceControl.notDiscovered')
  }
  return t(
    `admin.apis.routing.serviceControl.availability.${upstream.connection.availability}`
  )
}

function endpointBusy(item: PlatformEndpointCatalogItem) {
  return props.isBusy(`endpoint:${item.key}`)
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
  if (item.status === 'live') {
    return t('admin.apis.routing.catalog.actions.unpublish')
  }
  if (item.status === 'pending') {
    return t('admin.apis.routing.catalog.actions.pendingApply')
  }
  if (item.status === 'retiring') {
    return t('admin.apis.routing.catalog.actions.pendingApply')
  }
  return t('admin.apis.routing.catalog.actions.publish')
}

function primaryActionIcon(item: PlatformEndpointCatalogItem) {
  if (item.status === 'live') return 'i-lucide-power'
  if (item.status === 'pending' || item.status === 'retiring') {
    return 'i-lucide-clock-3'
  }
  return 'i-lucide-rocket'
}

function primaryActionColor(item: PlatformEndpointCatalogItem) {
  if (item.status === 'live') return 'neutral' as const
  if (item.status === 'pending' || item.status === 'retiring') {
    return 'warning' as const
  }
  return 'primary' as const
}

function toggleStatistics(item: PlatformEndpointCatalogItem) {
  const binding = item.route
  if (!binding) return
  emit(
    'update',
    item,
    { isStatistics: !binding.route.isStatistics },
    binding.route.isStatistics
      ? 'admin.apis.routing.catalog.feedback.statisticsDisabled'
      : 'admin.apis.routing.catalog.feedback.statisticsEnabled'
  )
}

function toggleApiKey(item: PlatformEndpointCatalogItem) {
  const binding = item.route
  if (!binding) return
  emit(
    'update',
    item,
    { isApiKey: !binding.route.isApiKey },
    binding.route.isApiKey
      ? 'admin.apis.routing.catalog.feedback.apiKeyDisabled'
      : 'admin.apis.routing.catalog.feedback.apiKeyEnabled'
  )
}
</script>

<template>
  <UCard
    variant="subtle"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon
              :name="service.upstream.serviceManaged ? 'i-lucide-server' : 'i-lucide-globe-2'"
              class="size-5"
            />
          </div>
          <div class="min-w-0">
            <h2 class="truncate text-base font-semibold text-highlighted">
              {{ serviceName() }}
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
            :color="serviceStateColor()"
            variant="subtle"
            size="sm"
          >
            {{ serviceStateLabel() }}
          </UBadge>
          <UButton
            v-if="service.upstream.serviceManaged"
            :to="{ path: `/admin/apis/upstreams/${service.upstream.id}`, query: route.query }"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-sliders-horizontal"
          >
            {{ $t('admin.apis.routing.catalog.actions.serviceSettings') }}
          </UButton>
          <UButton
            v-if="service.upstream.serviceManaged"
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-scan-search"
            :loading="isBusy(`discover:${service.upstream.id}`)"
            @click="emit('discover', service.upstream.id)"
          >
            {{ $t('admin.apis.routing.catalog.actions.rediscover') }}
          </UButton>
        </div>
      </div>
    </template>

    <div
      v-if="service.endpoints.length"
      class="divide-y divide-default"
    >
      <div
        v-for="item in service.endpoints"
        :key="item.key"
        class="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] lg:items-center sm:px-5"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <ApiHttpMethodBadge
              :method="itemMethod(item)"
              size="xs"
            />
            <code class="truncate text-xs font-semibold text-highlighted">
              {{ sourcePath(item) }}
            </code>
          </div>
          <p class="mt-1.5 truncate text-xs text-muted">
            {{ itemSummary(item) }}
          </p>
        </div>

        <div
          class="hidden items-center gap-2 text-dimmed lg:flex"
          aria-hidden="true"
        >
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
            <UBadge
              :color="statusColor(item.status)"
              variant="subtle"
              size="sm"
            >
              {{ $t(`admin.apis.routing.catalog.statuses.${item.status}`) }}
            </UBadge>
          </div>
          <div
            v-if="item.route"
            class="mt-2 flex flex-wrap items-center gap-1.5"
          >
            <UButton
              size="xs"
              :color="item.route.route.isStatistics ? 'primary' : 'neutral'"
              variant="soft"
              icon="i-lucide-chart-no-axes-column"
              :disabled="item.route.route.creditsCost > 0 || endpointBusy(item)"
              @click="toggleStatistics(item)"
            >
              {{ $t('admin.apis.routing.catalog.actions.statistics') }}
            </UButton>
            <UButton
              size="xs"
              :color="item.route.route.isApiKey ? 'primary' : 'neutral'"
              variant="soft"
              icon="i-lucide-key-round"
              :disabled="item.route.route.creditsCost > 0 || endpointBusy(item)"
              @click="toggleApiKey(item)"
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
            :disabled="!item.route || endpointBusy(item)"
            :aria-label="$t('admin.apis.routing.catalog.actions.advancedSettings')"
            @click="emit('edit', item)"
          />
          <UButton
            size="sm"
            :color="primaryActionColor(item)"
            :variant="item.status === 'live' ? 'outline' : 'solid'"
            :icon="primaryActionIcon(item)"
            :loading="endpointBusy(item)"
            :disabled="!item.publishable || !hasEnvironment || item.status === 'pending' || item.status === 'retiring'"
            @click="emit('primary', service, item)"
          >
            {{ primaryActionLabel(item) }}
          </UButton>
        </div>
      </div>
    </div>

    <div v-else class="px-5 py-8">
      <UEmpty
        :icon="service.upstream.serviceManaged ? 'i-lucide-file-search' : 'i-lucide-route-off'"
        :title="service.upstream.serviceManaged
          ? $t('admin.apis.routing.catalog.empty.serviceTitle')
          : $t('admin.apis.routing.catalog.empty.manualTitle')"
        :description="service.upstream.serviceManaged
          ? $t('admin.apis.routing.catalog.empty.serviceDescription')
          : $t('admin.apis.routing.catalog.empty.manualDescription')"
      >
        <template #actions>
          <UButton
            v-if="service.upstream.serviceManaged"
            size="sm"
            icon="i-lucide-scan-search"
            :loading="isBusy(`discover:${service.upstream.id}`)"
            @click="emit('discover', service.upstream.id)"
          >
            {{ $t('admin.apis.routing.catalog.actions.rediscover') }}
          </UButton>
          <UButton
            v-else
            size="sm"
            icon="i-lucide-plus"
            @click="emit('manual')"
          >
            {{ $t('admin.apis.routing.catalog.actions.manualRoute') }}
          </UButton>
        </template>
      </UEmpty>
    </div>
  </UCard>
</template>
