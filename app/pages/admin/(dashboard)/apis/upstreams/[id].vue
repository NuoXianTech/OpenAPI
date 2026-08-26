<script setup lang="ts">
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import type {
  ServiceConfigurationSyncOutcome,
  ServiceConfigurationValue,
  ServiceConfigurationView
} from '#shared/types/service-control'
import { parseFetchError } from '~/utils/client-error'
import { serviceAvailabilityColor } from '~/utils/platform-display'
import type { PlatformUpstream, PlatformUpstreamTarget } from '#shared/types/platform'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const confirm = useConfirmDialog()
const upstreamId = computed(() => String(route.params.id ?? ''))
const resource = usePrivateResource<ServiceConfigurationView | null>({
  path: () => `/api/admin/v1/upstreams/${upstreamId.value}/service`,
  defaultData: () => null
})
const upstreamResource = usePrivateResource<PlatformUpstream[]>({
  path: '/api/admin/v1/upstreams',
  defaultData: () => []
})
const managementUpstream = computed(() => upstreamResource.data.value.find(
  upstream => upstream.id === upstreamId.value
) ?? null)
const targetModalOpen = ref(false)
const editingTarget = ref<PlatformUpstreamTarget | null>(null)

const discovering = ref(false)
const synchronizing = ref(false)
const saving = ref(false)
const updatingToken = ref(false)
const serviceToken = ref('')
const businessEndpoints = computed(() =>
  resource.data.value?.endpoints.filter(endpoint => (
    !endpoint.system && !endpoint.support
  )) ?? []
)
const connectionStatusColor = computed(() => {
  const connection = resource.data.value?.connection
  if (!connection?.discovered) return 'warning' as const
  return serviceAvailabilityColor(connection.availability)
})
const connectionStatusLabel = computed(() => {
  const connection = resource.data.value?.connection
  if (!connection?.discovered) {
    return t('admin.apis.routing.serviceControl.notDiscovered')
  }
  return t(
    `admin.apis.routing.serviceControl.availability.${connection.availability}`
  )
})

useHead({
  title: () => resource.data.value?.connection.serviceName
    ?? t('admin.apis.routing.serviceControl.pageTitle')
})

watch(upstreamId, (id, previousId) => {
  if (!id || id === previousId) return
  resource.data.value = null
  void resource.refresh()
  void upstreamResource.refresh()
})

function openTarget(target: PlatformUpstreamTarget | null = null) {
  editingTarget.value = target
  targetModalOpen.value = true
}

async function refreshTargets() {
  await Promise.all([resource.refresh(), upstreamResource.refresh()])
}

async function updateTargetStatus(target: PlatformUpstreamTarget) {
  try {
    await $fetch(`/api/admin/v1/targets/${target.id}`, {
      method: 'PATCH',
      body: { enabled: !target.enabled }
    })
    toast.add({ title: t('common.feedback.updated'), color: 'success' })
    await refreshTargets()
  } catch (error: unknown) {
    toast.add({ title: parseFetchError(error, t('common.feedback.operationFailed')), color: 'error' })
  }
}

async function removeTarget(target: PlatformUpstreamTarget) {
  await confirm({
    title: t('admin.apis.routing.deleteTarget.title'),
    description: t('admin.apis.routing.deleteTarget.description'),
    confirmColor: 'error',
    onConfirm: async () => {
      try {
        await $fetch(`/api/admin/v1/targets/${target.id}`, { method: 'DELETE' })
        toast.add({ title: t('common.feedback.deleted'), color: 'success' })
        await refreshTargets()
      } catch (error: unknown) {
        toast.add({ title: parseFetchError(error, t('common.feedback.deleteFailed')), color: 'error' })
        throw error
      }
    }
  })
}

function targetItems(target: PlatformUpstreamTarget) {
  return [[
    { label: t('common.actions.edit'), icon: 'i-lucide-pencil', onSelect: () => openTarget(target) },
    {
      label: t(target.enabled ? 'common.actions.disable' : 'common.actions.enable'),
      icon: target.enabled ? 'i-lucide-pause' : 'i-lucide-play',
      onSelect: () => updateTargetStatus(target)
    },
    { label: t('common.actions.delete'), icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => removeTarget(target) }
  ]]
}

function targetStatusColor(status: string) {
  if (status === 'synced') return 'success' as const
  if (status === 'drifted') return 'warning' as const
  if (status === 'error') return 'error' as const
  return 'neutral' as const
}

function targetAvailabilityColor(
  target: ServiceConfigurationView['targets'][number]
) {
  if (!target.enabled) return 'neutral' as const
  return serviceAvailabilityColor(target.availability)
}

function targetAvailabilityLabel(
  target: ServiceConfigurationView['targets'][number]
) {
  const status = target.enabled ? target.availability : 'disabled'
  return t(`admin.apis.routing.serviceControl.targetAvailability.${status}`)
}

function desiredRevisionLabel(revision: number) {
  return revision > 0
    ? t('admin.apis.routing.serviceControl.revisionLabel', { revision })
    : t('admin.apis.routing.serviceControl.configurationNotSaved')
}

function targetRevisionLabel(revision: number | null) {
  return revision !== null && revision > 0
    ? t('admin.apis.routing.serviceControl.revisionLabel', { revision })
    : null
}

function targetStatusLabel(target: ServiceConfigurationView['targets'][number]) {
  if (
    target.configurationStatus === 'unknown'
    && resource.data.value?.connection.configurationRevision === 0
    && target.configurationRevision === 0
  ) {
    return t('admin.apis.routing.serviceControl.targetStatuses.initial')
  }
  return t(
    `admin.apis.routing.serviceControl.targetStatuses.${target.configurationStatus}`
  )
}

async function discover() {
  discovering.value = true
  try {
    const result = await $fetch<ServiceConfigurationView>(
      `/api/admin/v1/upstreams/${upstreamId.value}/discover`,
      { method: 'POST' }
    )
    resource.data.value = result
    toast.add({
      title: t('admin.apis.routing.serviceControl.discoverySucceeded'),
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: parseFetchError(
        error,
        t('admin.apis.routing.serviceControl.discoveryFailed')
      ),
      color: 'error'
    })
    await resource.refresh()
  } finally {
    discovering.value = false
  }
}

async function updateServiceToken() {
  if (serviceToken.value.length < 32) {
    toast.add({
      title: t('admin.apis.routing.validation.serviceTokenInvalid'),
      color: 'error'
    })
    return
  }
  updatingToken.value = true
  try {
    await $fetch(`/api/admin/v1/upstreams/${upstreamId.value}/token`, {
      method: 'PUT',
      body: { serviceToken: serviceToken.value }
    })
    serviceToken.value = ''
    toast.add({
      title: t('admin.apis.routing.serviceControl.tokenUpdated'),
      description: t('admin.apis.routing.serviceControl.rediscoverAfterToken'),
      color: 'success'
    })
    await resource.refresh()
  } catch (error: unknown) {
    toast.add({
      title: parseFetchError(
        error,
        t('admin.apis.routing.serviceControl.tokenUpdateFailed')
      ),
      color: 'error'
    })
  } finally {
    updatingToken.value = false
  }
}

async function saveConfiguration(payload: {
  expectedRevision: number
  values: Record<string, ServiceConfigurationValue>
  secrets: Record<string, string | null>
}) {
  saving.value = true
  try {
    const result = await $fetch<ServiceConfigurationSyncOutcome>(
      `/api/admin/v1/upstreams/${upstreamId.value}/configuration`,
      { method: 'PUT', body: payload }
    )
    toast.add({
      title: result.status === 'synced'
        ? t('admin.apis.routing.serviceControl.configurationSynced')
        : t('admin.apis.routing.serviceControl.configurationDrifted'),
      description: t(
        'admin.apis.routing.serviceControl.configurationRevision',
        { revision: result.revision }
      ),
      color: result.status === 'synced' ? 'success' : 'warning'
    })
    await resource.refresh()
  } catch (error: unknown) {
    toast.add({
      title: parseFetchError(
        error,
        t('admin.apis.routing.serviceControl.configurationSaveFailed')
      ),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function synchronizeConfiguration() {
  synchronizing.value = true
  try {
    const result = await $fetch<ServiceConfigurationSyncOutcome>(
      `/api/admin/v1/upstreams/${upstreamId.value}/configuration/sync`,
      { method: 'POST' }
    )
    toast.add({
      title: result.status === 'synced'
        ? t('admin.apis.routing.serviceControl.configurationSynced')
        : t('admin.apis.routing.serviceControl.configurationDrifted'),
      color: result.status === 'synced' ? 'success' : 'warning'
    })
    await resource.refresh()
  } catch (error: unknown) {
    toast.add({
      title: parseFetchError(
        error,
        t('admin.apis.routing.serviceControl.configurationSyncFailed')
      ),
      color: 'error'
    })
  } finally {
    synchronizing.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <UButton
          to="/admin/apis/upstreams"
          color="neutral"
          variant="link"
          icon="i-lucide-arrow-left"
          class="mb-2 px-0"
        >
          {{ $t('admin.apis.routing.serviceControl.backToUpstreams') }}
        </UButton>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ resource.data.value?.connection.serviceName
            || $t('admin.apis.routing.serviceControl.pageTitle') }}
        </h1>
        <p class="mt-2 text-sm leading-6 text-muted">
          {{ $t('admin.apis.routing.serviceControl.pageDescription') }}
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
          icon="i-lucide-scan-search"
          :loading="discovering"
          @click="discover"
        >
          {{ $t('admin.apis.routing.serviceControl.discover') }}
        </UButton>
      </div>
    </div>

    <div
      v-if="resource.loading.value && !resource.data.value"
      class="space-y-4"
      aria-busy="true"
    >
      <UCard
        v-for="index in 3"
        :key="index"
        variant="subtle"
      >
        <div class="space-y-4">
          <USkeleton class="h-5 w-40" />
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-2/3" />
        </div>
      </UCard>
    </div>

    <UAlert
      v-if="resource.error.value"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="$t('common.feedback.loadFailed')"
      :description="parseFetchError(
        resource.error.value,
        $t('common.feedback.loadFailed')
      )"
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

    <template v-if="resource.data.value">
      <UCard variant="subtle">
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                {{ $t('admin.apis.routing.serviceControl.connectionTitle') }}
              </h2>
              <p class="mt-1 text-xs leading-5 text-muted">
                {{ $t('admin.apis.routing.serviceControl.connectionDescription') }}
              </p>
            </div>
            <UBadge
              class="sm:ms-auto"
              :color="connectionStatusColor"
              variant="subtle"
            >
              {{ connectionStatusLabel }}
            </UBadge>
          </div>
        </template>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p class="text-xs text-muted">
              Service ID
            </p>
            <p class="mt-1 break-all font-mono text-sm text-highlighted">
              {{ resource.data.value.connection.serviceId || '—' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Version / Commit
            </p>
            <p class="mt-1 font-mono text-sm text-highlighted">
              {{ resource.data.value.connection.serviceVersion || '—' }}
              <span class="text-muted">/</span>
              {{ resource.data.value.connection.serviceCommit || '—' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              OpenAPI SHA-256
            </p>
            <p class="mt-1 truncate font-mono text-sm text-highlighted">
              {{ resource.data.value.connection.openapiSha256 || '—' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              {{ $t('admin.apis.routing.serviceControl.desiredRevision') }}
            </p>
            <p class="mt-1 font-mono text-sm text-highlighted">
              {{ desiredRevisionLabel(
                resource.data.value.connection.configurationRevision
              ) }}
            </p>
          </div>
        </div>

        <USeparator class="my-5" />

        <UFormField
          name="serviceToken"
          :label="$t('admin.apis.routing.serviceControl.replaceToken')"
          :description="$t('admin.apis.routing.serviceControl.replaceTokenDescription')"
        >
          <div class="flex flex-col gap-2 sm:flex-row">
            <UInput
              v-model="serviceToken"
              type="password"
              autocomplete="new-password"
              :placeholder="$t('admin.apis.routing.upstreamForm.serviceTokenPlaceholder')"
              class="min-w-0 flex-1 font-mono"
            />
            <UButton
              color="neutral"
              variant="outline"
              :loading="updatingToken"
              @click="updateServiceToken"
            >
              {{ $t('admin.apis.routing.serviceControl.updateToken') }}
            </UButton>
          </div>
        </UFormField>
      </UCard>

      <UAlert
        v-if="!resource.data.value.connection.discovered"
        color="info"
        variant="subtle"
        icon="i-lucide-scan-search"
        :title="$t('admin.apis.routing.serviceControl.discoverFirstTitle')"
        :description="$t('admin.apis.routing.serviceControl.discoverFirstDescription')"
      />

      <!--
        Targets stay reachable before discovery succeeds: discovery itself needs
        at least one enabled Target, so gating this card would strand the Upstream.
      -->
      <UCard variant="subtle">
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                {{ $t('admin.apis.routing.serviceControl.targetsTitle') }}
              </h2>
              <p class="mt-1 text-xs leading-5 text-muted">
                {{ $t('admin.apis.routing.serviceControl.targetsDescription') }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-plus"
              :disabled="!managementUpstream"
              @click="openTarget()"
            >
              {{ $t('admin.apis.routing.actions.addTarget') }}
            </UButton>
          </div>
        </template>
        <div class="divide-y divide-default">
          <div
            v-for="target in resource.data.value.targets"
            :key="target.id"
            class="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate font-mono text-sm text-highlighted">
                {{ target.baseUrl }}
              </p>
              <p v-if="target.lastError" class="mt-1 text-xs text-error">
                {{ target.lastError }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge
                :color="targetAvailabilityColor(target)"
                variant="subtle"
              >
                {{ targetAvailabilityLabel(target) }}
              </UBadge>
              <span
                v-if="targetRevisionLabel(target.configurationRevision)"
                class="font-mono text-xs text-muted"
              >
                {{ targetRevisionLabel(target.configurationRevision) }}
              </span>
              <UBadge
                :color="targetStatusColor(target.configurationStatus)"
                variant="subtle"
              >
                {{ targetStatusLabel(target) }}
              </UBadge>
              <UDropdownMenu
                v-if="managementUpstream?.targets.find(item => item.id === target.id)"
                :items="targetItems(managementUpstream.targets.find(item => item.id === target.id)!)"
                :content="{ align: 'end' }"
              >
                <UButton
                  icon="i-lucide-ellipsis"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                />
              </UDropdownMenu>
            </div>
          </div>
        </div>
        <UEmpty
          v-if="resource.data.value.targets.length === 0"
          icon="i-lucide-server-off"
          :title="$t('admin.apis.routing.empty.targetsTitle')"
        />
      </UCard>

      <template v-if="resource.data.value.connection.discovered">
        <section class="space-y-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 class="text-lg font-semibold text-highlighted">
                {{ $t('admin.apis.routing.serviceControl.configurationTitle') }}
              </h2>
              <p class="mt-1 text-sm text-muted">
                {{ $t('admin.apis.routing.serviceControl.configurationDescription') }}
              </p>
            </div>
            <UButton
              class="sm:ms-auto"
              color="neutral"
              variant="outline"
              icon="i-lucide-refresh-cw"
              :disabled="resource.data.value.connection.configurationRevision < 1"
              :loading="synchronizing"
              @click="synchronizeConfiguration"
            >
              {{ $t('admin.apis.routing.serviceControl.syncAllTargets') }}
            </UButton>
          </div>

          <UAlert
            color="info"
            variant="subtle"
            icon="i-lucide-shield-check"
            :title="$t('admin.apis.routing.serviceControl.secretBoundaryTitle')"
            :description="$t('admin.apis.routing.serviceControl.secretBoundaryDescription')"
          />

          <AdminServiceConfigurationForm
            v-if="resource.data.value.definition"
            :view="resource.data.value"
            :loading="saving"
            @submit="saveConfiguration"
          />
        </section>

        <UCard variant="subtle">
          <template #header>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="text-base font-semibold text-highlighted">
                  {{ $t('admin.apis.routing.serviceControl.endpointsTitle') }}
                </h2>
                <p class="mt-1 text-xs leading-5 text-muted">
                  {{ $t('admin.apis.routing.serviceControl.endpointsDescription', {
                    count: businessEndpoints.length
                  }) }}
                </p>
              </div>
              <UButton
                :to="{
                  path: '/admin/apis',
                  query: { ...route.query, upstreamId: upstreamId }
                }"
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-rocket"
              >
                {{ $t('admin.apis.routing.catalog.actions.managePublishing') }}
              </UButton>
            </div>
          </template>
          <div v-if="businessEndpoints.length" class="divide-y divide-default">
            <div
              v-for="endpoint in businessEndpoints"
              :key="`${endpoint.method}:${endpoint.path}`"
              class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
            >
              <ApiHttpMethodBadge :method="endpoint.method" size="xs" />
              <code class="min-w-0 flex-1 break-all text-xs text-highlighted">
                {{ endpoint.path }}
              </code>
              <span class="text-xs text-muted">
                {{ endpoint.summary || endpoint.operationId || '—' }}
              </span>
            </div>
          </div>
          <UEmpty
            v-else
            icon="i-lucide-file-question"
            :title="$t('admin.apis.routing.serviceControl.noEndpoints')"
          />
        </UCard>
      </template>
    </template>

    <AdminPlatformTargetModal
      v-if="managementUpstream"
      v-model:open="targetModalOpen"
      :upstream="managementUpstream"
      :target="editingTarget"
      @saved="refreshTargets"
    />
  </div>
</template>
