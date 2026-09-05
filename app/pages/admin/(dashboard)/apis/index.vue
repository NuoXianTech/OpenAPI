<script setup lang="ts">
import { useAdminEndpointCatalogPage } from '~/composables/admin/use-admin-endpoint-catalog-page'
import { parseFetchError } from '~/utils/client-error'

const { t } = useI18n()
const {
  catalog,
  applyChanges,
  applyChangeCount,
  clearFocusedService,
  canApply,
  discoverAllServices,
  discoverService,
  driftedServices,
  editingRoute,
  createRouteUpstreamId,
  focusedUpstreamId,
  requiresDiscovery,
  handlePrimaryAction,
  serviceUpstreams,
  isBusy,
  loading,
  openCreateRoute,
  openEditRoute,
  removeRoute,
  products,
  refresh,
  resetFilters,
  resourceError,
  routeModalOpen,
  search,
  statusFilter,
  statusItems,
  updatePublication,
  upstreams,
  visibleServices
} = useAdminEndpointCatalogPage()

useHead({ title: () => t('admin.apis.routing.catalog.title') })
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ $t('admin.apis.routing.catalog.title') }}
        </h1>
        <p class="mt-2 text-sm leading-6 text-muted">
          {{ $t('admin.apis.routing.catalog.description') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="canApply"
          icon="i-lucide-cloud-upload"
          :loading="isBusy('apply:runtime')"
          :disabled="isBusy('discover:all')"
          @click="applyChanges"
        >
          {{ $t('admin.apis.routing.catalog.actions.applyAllChanges', { count: applyChangeCount }) }}
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-plus"
          :disabled="products.length === 0 || upstreams.length === 0 || isBusy('apply:runtime')"
          @click="openCreateRoute()"
        >
          {{ $t('admin.apis.routing.catalog.actions.manualRoute') }}
        </UButton>
        <UButton
          icon="i-lucide-scan-search"
          :loading="isBusy('discover:all')"
          :disabled="serviceUpstreams.length === 0 || isBusy('apply:runtime')"
          @click="discoverAllServices"
        >
          {{ $t('admin.apis.routing.catalog.actions.syncServices') }}
        </UButton>
      </div>
    </div>

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

    <UAlert
      v-if="driftedServices.length > 0"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="$t('admin.apis.routing.catalog.drift.title', {
        count: catalog.totals.driftedTargets
      })"
    >
      <template #description>
        <p>
          {{ requiresDiscovery
            ? $t('admin.apis.routing.catalog.drift.discoveryRequired')
            : $t('admin.apis.routing.catalog.drift.description') }}
        </p>
        <ul class="mt-2 space-y-1">
          <li
            v-for="service in driftedServices"
            :key="service.upstream.id"
            class="text-xs"
          >
            <span class="font-medium">{{ service.upstream.name }}</span>
            <span
              v-for="item in service.targetDrift"
              :key="item.targetId"
              class="ms-2 block break-all font-mono text-muted"
            >
              <template v-if="item.kind === 'address_changed'">
                {{ $t('admin.apis.routing.catalog.drift.addressChanged', {
                  runtime: item.runtimeBaseUrl,
                  desired: item.desiredBaseUrl
                }) }}
              </template>
              <template v-else-if="item.kind === 'unpublished'">
                {{ $t('admin.apis.routing.catalog.drift.unpublished', {
                  desired: item.desiredBaseUrl
                }) }}
              </template>
              <template v-else>
                {{ $t('admin.apis.routing.catalog.drift.withdrawn', {
                  runtime: item.runtimeBaseUrl
                }) }}
              </template>
            </span>
          </li>
        </ul>
      </template>
      <template #actions>
        <UButton
          color="warning"
          variant="soft"
          size="xs"
          icon="i-lucide-scan-search"
          :loading="isBusy('discover:all')"
          @click="discoverAllServices"
        >
          {{ $t('admin.apis.routing.catalog.actions.syncServices') }}
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
          {{ catalog.totals.discovered }}
        </p>
      </div>
      <div class="border-b border-default px-5 py-4 xl:border-e xl:border-b-0">
        <p class="text-xs font-medium text-muted">
          {{ $t('admin.apis.routing.catalog.metrics.live') }}
        </p>
        <p class="mt-1 font-mono text-2xl font-semibold text-success">
          {{ catalog.totals.live }}
        </p>
      </div>
      <div class="border-b border-default px-5 py-4 sm:border-e sm:border-b-0">
        <p class="text-xs font-medium text-muted">
          {{ $t('admin.apis.routing.catalog.metrics.available') }}
        </p>
        <p class="mt-1 font-mono text-2xl font-semibold text-highlighted">
          {{ catalog.totals.available }}
        </p>
      </div>
      <div class="px-5 py-4">
        <p class="text-xs font-medium text-muted">
          {{ $t('admin.apis.routing.catalog.metrics.pending') }}
        </p>
        <p
          class="mt-1 font-mono text-2xl font-semibold"
          :class="catalog.totals.pending > 0 ? 'text-warning' : 'text-highlighted'"
        >
          {{ catalog.totals.pending }}
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

    <div
      v-if="loading && catalog.services.length === 0"
      class="space-y-4"
    >
      <USkeleton
        v-for="index in 2"
        :key="index"
        class="h-56 rounded-xl"
      />
    </div>

    <div v-else-if="visibleServices.length" class="space-y-4">
      <AdminPlatformEndpointServiceCard
        v-for="service in visibleServices"
        :key="service.upstream.id"
        :service="service"
        :is-busy="isBusy"
        @discover="discoverService"
        @edit="openEditRoute"
        @manual="openCreateRoute"
        @primary="handlePrimaryAction"
        @remove="removeRoute"
        @update="updatePublication"
      />
    </div>

    <UEmpty
      v-else
      icon="i-lucide-waypoints"
      :title="catalog.services.length === 0
        ? $t('admin.apis.routing.catalog.empty.catalogTitle')
        : $t('admin.apis.routing.catalog.empty.filterTitle')"
      :description="catalog.services.length === 0
        ? $t('admin.apis.routing.catalog.empty.catalogDescription')
        : $t('admin.apis.routing.catalog.empty.filterDescription')"
    >
      <template #actions>
        <UButton
          v-if="catalog.services.length === 0"
          to="/admin/apis/upstreams"
          icon="i-lucide-server-cog"
        >
          {{ $t('admin.apis.routing.actions.createUpstream') }}
        </UButton>
        <UButton
          v-else
          color="neutral"
          variant="outline"
          @click="resetFilters"
        >
          {{ $t('admin.apis.routing.catalog.actions.clearFilters') }}
        </UButton>
      </template>
    </UEmpty>

    <AdminPlatformRouteModal
      v-model:open="routeModalOpen"
      :products="products"
      :upstreams="upstreams"
      :route-binding="editingRoute"
      :initial-upstream-id="createRouteUpstreamId"
      @saved="refresh"
    />
  </div>
</template>
