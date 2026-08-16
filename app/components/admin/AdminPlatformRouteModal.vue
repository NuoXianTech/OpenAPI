<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { PlatformEndpointPublicationResult, PlatformProduct, PlatformRouteBinding, PlatformUpstream, PlatformWorkspace } from '~/types/platform'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import { compactFormErrors, integerRangeError, maxLengthError, requiredTextError } from '~/utils/form-validation'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  workspace: PlatformWorkspace
  products: PlatformProduct[]
  upstreams: PlatformUpstream[]
  routeBinding?: PlatformRouteBinding | null
  environmentId?: string
}>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const { t } = useI18n()

type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type RouteState = 'draft' | 'active' | 'disabled'

interface RouteFormState {
  apiVersionId: string
  name: string
  method: HttpMethod
  pathPattern: string
  hostsText: string
  upstreamServiceId: string
  upstreamPathTemplate: string
  isApiKey: boolean
  isStatistics: boolean
  creditsCost: number
  rateLimitPerSecond: number
  rateLimitPerMinute: number
  rateLimitPerHour: number
  rateLimitPerDay: number
  timeoutMs: number
  maxRequestKiB: number
  maxResponseKiB: number
  catalogStatus: 'automatic' | 'maintenance'
  sensitiveQueryParameters: string[]
  state: RouteState
}

function initialState(): RouteFormState {
  const binding = props.routeBinding
  if (!binding) {
    return {
      apiVersionId: '',
      name: '',
      method: 'GET',
      pathPattern: '/v1/',
      hostsText: '',
      upstreamServiceId: '',
      upstreamPathTemplate: '/',
      isApiKey: false,
      isStatistics: true,
      creditsCost: 0,
      rateLimitPerSecond: 0,
      rateLimitPerMinute: 0,
      rateLimitPerHour: 0,
      rateLimitPerDay: 0,
      timeoutMs: 10_000,
      maxRequestKiB: 1024,
      maxResponseKiB: 10_240,
      catalogStatus: 'automatic',
      sensitiveQueryParameters: [],
      state: 'active'
    }
  }

  const route = binding.route
  return {
    apiVersionId: route.apiVersionId,
    name: route.name,
    method: route.method,
    pathPattern: route.pathPattern,
    hostsText: route.hosts.join('\n'),
    upstreamServiceId: route.upstreamServiceId,
    upstreamPathTemplate: route.upstreamPathTemplate,
    isApiKey: route.isApiKey,
    isStatistics: route.isStatistics,
    creditsCost: route.creditsCost,
    rateLimitPerSecond: route.rateLimitPerSecond,
    rateLimitPerMinute: route.rateLimitPerMinute,
    rateLimitPerHour: route.rateLimitPerHour,
    rateLimitPerDay: route.rateLimitPerDay,
    timeoutMs: route.timeoutMs,
    maxRequestKiB: route.maxRequestBytes / 1024,
    maxResponseKiB: route.maxResponseBytes / 1024,
    catalogStatus: route.catalogStatus,
    sensitiveQueryParameters: [...route.sensitiveQueryParameters],
    state: route.state
  }
}

const state = reactive<RouteFormState>(initialState())
const loading = ref(false)
const advancedOpen = ref(false)
const isEditing = computed(() => Boolean(props.routeBinding))
const isServiceManaged = computed(() => props.routeBinding?.route.managedBy === 'service')
const hostPattern = /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

const versionItems = computed(() => props.products
  .filter(product => product.workspaceId === props.workspace.id && product.lifecycle === 'active')
  .flatMap(product => product.versions
    .filter(version => version.state === 'published' || version.state === 'deprecated')
    .map(version => ({
      label: `${product.name} / ${version.version}`,
      value: version.id,
      description: product.slug
    }))))
const upstreamItems = computed(() => props.upstreams
  .filter(upstream => upstream.workspaceId === props.workspace.id && upstream.status === 'active')
  .map(upstream => ({
    label: upstream.name,
    value: upstream.id,
    description: `${upstream.kind} · ${upstream.protocol}`
  })))
const methodItems: HttpMethod[] = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']
const routeStateItems = computed(() => [
  { label: t('admin.apis.routing.routeStates.active'), value: 'active' },
  ...(!isServiceManaged.value
    ? [{ label: t('admin.apis.routing.routeStates.draft'), value: 'draft' as const }]
    : []),
  { label: t('admin.apis.routing.routeStates.disabled'), value: 'disabled' }
])
const catalogStatusItems = computed(() => [
  { label: t('admin.apis.routing.catalogStatuses.automatic'), value: 'automatic' },
  { label: t('admin.apis.routing.catalogStatuses.maintenance'), value: 'maintenance' }
])

watch(open, (isOpen) => {
  if (isOpen) {
    Object.assign(state, initialState())
    if (!versionItems.value.some(item => item.value === state.apiVersionId)) {
      state.apiVersionId = versionItems.value[0]?.value ?? ''
    }
    if (!upstreamItems.value.some(item => item.value === state.upstreamServiceId)) {
      state.upstreamServiceId = upstreamItems.value[0]?.value ?? ''
    }
    advancedOpen.value = isEditing.value
  }
})
watch([versionItems, upstreamItems], () => {
  if (!versionItems.value.some(item => item.value === state.apiVersionId)) {
    state.apiVersionId = versionItems.value[0]?.value ?? ''
  }
  if (!upstreamItems.value.some(item => item.value === state.upstreamServiceId)) {
    state.upstreamServiceId = upstreamItems.value[0]?.value ?? ''
  }
}, { immediate: true })

watch(() => state.creditsCost, (creditsCost) => {
  if (creditsCost > 0) {
    state.isApiKey = true
    state.isStatistics = true
  }
})

function parseHosts(value: string): string[] {
  return Array.from(new Set(value.split(/[\s,]+/).map(host => host.trim()).filter(Boolean)))
}

function validateRouteForm(value: Partial<RouteFormState>): FormError<string>[] {
  const errors = compactFormErrors(
    requiredTextError('apiVersionId', value.apiVersionId, t('admin.apis.routing.validation.versionRequired')),
    requiredTextError('name', value.name, t('admin.apis.routing.validation.nameRequired')),
    maxLengthError('name', value.name, 160, t('admin.apis.routing.validation.nameMaxLength')),
    requiredTextError('pathPattern', value.pathPattern, t('admin.apis.routing.validation.pathRequired')),
    value.pathPattern && !value.pathPattern.trim().startsWith('/')
      ? { name: 'pathPattern', message: t('admin.apis.routing.validation.pathInvalid') }
      : null,
    requiredTextError('upstreamServiceId', value.upstreamServiceId, t('admin.apis.routing.validation.upstreamRequired')),
    requiredTextError('upstreamPathTemplate', value.upstreamPathTemplate, t('admin.apis.routing.validation.upstreamPathRequired')),
    value.upstreamPathTemplate && !value.upstreamPathTemplate.trim().startsWith('/')
      ? { name: 'upstreamPathTemplate', message: t('admin.apis.routing.validation.pathInvalid') }
      : null,
    integerRangeError('timeoutMs', value.timeoutMs, t('admin.apis.routing.validation.timeoutInvalid'), 100, 120_000),
    integerRangeError('maxRequestKiB', value.maxRequestKiB, t('admin.apis.routing.validation.requestSizeInvalid'), 0, 1_048_576),
    integerRangeError('maxResponseKiB', value.maxResponseKiB, t('admin.apis.routing.validation.responseSizeInvalid'), 0, 2_097_151),
    integerRangeError('creditsCost', value.creditsCost, t('admin.apis.routing.validation.creditsCostInvalid'), 0, 1_000_000),
    integerRangeError('rateLimitPerSecond', value.rateLimitPerSecond, t('admin.apis.routing.validation.rateLimitInvalid'), 0, 1_000_000),
    integerRangeError('rateLimitPerMinute', value.rateLimitPerMinute, t('admin.apis.routing.validation.rateLimitInvalid'), 0, 10_000_000),
    integerRangeError('rateLimitPerHour', value.rateLimitPerHour, t('admin.apis.routing.validation.rateLimitInvalid'), 0, 100_000_000),
    integerRangeError('rateLimitPerDay', value.rateLimitPerDay, t('admin.apis.routing.validation.rateLimitInvalid'), 0, 1_000_000_000),
    value.creditsCost && value.creditsCost > 0 && (!value.isApiKey || !value.isStatistics)
      ? { name: 'creditsCost', message: t('admin.apis.routing.validation.paidRouteRequiresGovernance') }
      : null,
    value.sensitiveQueryParameters?.some(parameter => !/^[A-Za-z0-9_.-]+$/.test(parameter))
      ? { name: 'sensitiveQueryParameters', message: t('admin.apis.routing.validation.sensitiveQueryInvalid') }
      : null
  )

  const invalidHost = parseHosts(value.hostsText ?? '').find(host => !hostPattern.test(host))
  if (invalidHost) {
    errors.push({ name: 'hostsText', message: t('admin.apis.routing.validation.hostInvalid') })
  }
  return errors
}

async function onSubmit(event: FormSubmitEvent<RouteFormState>) {
  loading.value = true
  try {
    const body = {
      apiVersionId: event.data.apiVersionId,
      name: event.data.name.trim(),
      hosts: parseHosts(event.data.hostsText),
      method: event.data.method,
      pathPattern: event.data.pathPattern.trim(),
      upstreamServiceId: event.data.upstreamServiceId,
      upstreamPathTemplate: event.data.upstreamPathTemplate.trim(),
      isApiKey: event.data.isApiKey,
      isStatistics: event.data.isStatistics,
      creditsCost: event.data.creditsCost,
      rateLimitPerSecond: event.data.rateLimitPerSecond,
      rateLimitPerMinute: event.data.rateLimitPerMinute,
      rateLimitPerHour: event.data.rateLimitPerHour,
      rateLimitPerDay: event.data.rateLimitPerDay,
      timeoutMs: event.data.timeoutMs,
      maxRequestBytes: event.data.maxRequestKiB * 1024,
      maxResponseBytes: event.data.maxResponseKiB * 1024,
      catalogStatus: event.data.catalogStatus,
      sensitiveQueryParameters: Array.from(new Set(
        event.data.sensitiveQueryParameters.map(item => item.trim()).filter(Boolean)
      )),
      state: event.data.state
    }
    const routeId = props.routeBinding?.route.id
    if (routeId && isServiceManaged.value) {
      if (!props.environmentId) throw new Error('environment is required for a Service-managed Route')
      const result = await $fetch<PlatformEndpointPublicationResult>(`/api/admin/v1/service-endpoints/${routeId}`, {
        method: 'PATCH',
        body: {
          environmentId: props.environmentId,
          enabled: event.data.state === 'active',
          name: body.name,
          isApiKey: body.isApiKey,
          isStatistics: body.isStatistics,
          creditsCost: body.creditsCost,
          rateLimitPerSecond: body.rateLimitPerSecond,
          rateLimitPerMinute: body.rateLimitPerMinute,
          rateLimitPerHour: body.rateLimitPerHour,
          rateLimitPerDay: body.rateLimitPerDay,
          timeoutMs: body.timeoutMs,
          maxRequestBytes: body.maxRequestBytes,
          maxResponseBytes: body.maxResponseBytes,
          catalogStatus: body.catalogStatus,
          sensitiveQueryParameters: body.sensitiveQueryParameters
        }
      })
      toast.add({
        title: t('admin.apis.routing.feedback.routeUpdated'),
        description: result.applied
          ? t('admin.apis.routing.feedback.runtimeUpdated')
          : t('admin.apis.routing.catalog.feedback.savedPendingDescription', {
              reason: result.publicationError?.message ?? t('admin.apis.routing.feedback.publishFailed')
            }),
        color: result.applied ? 'success' : 'warning'
      })
      open.value = false
      emit('saved')
      return
    }
    await $fetch(routeId ? `/api/admin/v1/routes/${routeId}` : '/api/admin/v1/routes', {
      method: routeId ? 'PATCH' : 'POST',
      body
    })
    if (props.environmentId) {
      try {
        await $fetch('/api/admin/v1/revisions/publish', {
          method: 'POST',
          body: { environmentId: props.environmentId }
        })
      } catch (error: unknown) {
        toast.add({
          title: t(routeId
            ? 'admin.apis.routing.feedback.routeUpdated'
            : 'admin.apis.routing.feedback.routeCreated'),
          description: parseFetchError(
            error,
            t('admin.apis.routing.feedback.savedPendingPublish')
          ),
          color: 'warning'
        })
        open.value = false
        emit('saved')
        return
      }
    }
    toast.add({
      title: t(routeId ? 'admin.apis.routing.feedback.routeUpdated' : 'admin.apis.routing.feedback.routeCreated'),
      description: props.environmentId
        ? t('admin.apis.routing.feedback.runtimeUpdated')
        : undefined,
      color: 'success'
    })
    open.value = false
    emit('saved')
  } catch (error: unknown) {
    toast.add({
      title: parseFetchError(
        error,
        t(isEditing.value ? 'admin.apis.routing.feedback.updateFailed' : 'admin.apis.routing.feedback.createFailed')
      ),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t(isEditing ? 'admin.apis.routing.routeForm.editTitle' : 'admin.apis.routing.routeForm.createTitle')"
    :description="$t(isEditing ? 'admin.apis.routing.routeForm.editDescription' : 'admin.apis.routing.routeForm.createDescription')"
    :dismissible="!loading"
    :ui="adminModalUi({ content: 'sm:max-w-3xl' })"
  >
    <template #body>
      <UForm
        id="platform-route-form"
        :state="state"
        :validate="validateRouteForm"
        class="space-y-5"
        @submit="onSubmit"
      >
        <UFormField
          name="apiVersionId"
          :label="$t('admin.apis.routing.fields.productVersion')"
          :description="versionItems.length === 0 ? $t('admin.apis.routing.routeForm.noVersionsHelp') : undefined"
          required
        >
          <USelectMenu
            v-model="state.apiVersionId"
            :items="versionItems"
            value-key="value"
            class="w-full"
            :disabled="versionItems.length === 0 || isServiceManaged"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <UFormField
            name="method"
            :label="$t('admin.apis.routing.fields.method')"
          >
            <USelect
              v-model="state.method"
              :items="methodItems"
              class="w-full font-mono"
              :disabled="isServiceManaged"
            />
          </UFormField>
          <UFormField
            name="pathPattern"
            :label="$t('admin.apis.routing.fields.publicPath')"
            :description="$t('admin.apis.routing.routeForm.pathHelp')"
            required
          >
            <UInput
              v-model="state.pathPattern"
              placeholder="/v1/weather/{city}"
              class="w-full font-mono"
              :disabled="isServiceManaged"
            />
          </UFormField>
        </div>

        <UFormField
          name="name"
          :label="$t('admin.apis.routing.fields.name')"
          required
        >
          <UInput
            v-model="state.name"
            :placeholder="$t('admin.apis.routing.routeForm.namePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="hostsText"
          :label="$t('admin.apis.routing.fields.hosts')"
          :description="$t('admin.apis.routing.routeForm.hostsHelp')"
        >
          <UTextarea
            v-model="state.hostsText"
            :rows="2"
            placeholder="api.example.com"
            class="w-full font-mono"
            :disabled="isServiceManaged"
          />
        </UFormField>

        <div class="rounded-lg border border-default bg-elevated/30 p-4">
          <div class="mb-4 flex items-start gap-3">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UIcon
                name="i-lucide-route"
                class="size-4.5"
              />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-highlighted">
                {{ $t('admin.apis.routing.routeForm.forwardingTitle') }}
              </h3>
              <p class="mt-1 text-xs leading-5 text-muted">
                {{ $t('admin.apis.routing.routeForm.forwardingDescription') }}
              </p>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              name="upstreamServiceId"
              :label="$t('admin.apis.routing.fields.upstream')"
              :description="upstreamItems.length === 0 ? $t('admin.apis.routing.routeForm.noUpstreamsHelp') : undefined"
              required
            >
              <USelectMenu
                v-model="state.upstreamServiceId"
                :items="upstreamItems"
                value-key="value"
                class="w-full"
                :disabled="upstreamItems.length === 0 || isServiceManaged"
              />
            </UFormField>
            <UFormField
              name="upstreamPathTemplate"
              :label="$t('admin.apis.routing.fields.upstreamPath')"
              :description="$t('admin.apis.routing.routeForm.upstreamPathHelp')"
              required
            >
              <UInput
                v-model="state.upstreamPathTemplate"
                placeholder="/weather/{path.city}"
                class="w-full font-mono"
                :disabled="isServiceManaged"
              />
            </UFormField>
          </div>
        </div>

        <UCollapsible
          v-model:open="advancedOpen"
          class="rounded-lg border border-default bg-elevated/30"
        >
          <button
            type="button"
            class="flex w-full items-start gap-3 p-4 text-left"
          >
            <div class="min-w-0 flex-1">
              <h3 class="text-sm font-semibold text-highlighted">
                {{ $t('admin.apis.routing.routeForm.governanceTitle') }}
              </h3>
              <p class="mt-1 text-xs leading-5 text-muted">
                {{ $t('admin.apis.routing.routeForm.governanceDescription') }}
              </p>
            </div>
            <UIcon
              name="i-lucide-chevron-down"
              class="mt-0.5 size-4 shrink-0 text-muted transition-transform"
              :class="advancedOpen ? 'rotate-180' : ''"
            />
          </button>

          <template #content>
            <div class="space-y-5 border-t border-default p-4">
              <div class="grid gap-4 sm:grid-cols-3">
                <UFormField :label="$t('admin.apis.routing.fields.apiKeyRequired')">
                  <USwitch
                    v-model="state.isApiKey"
                    :disabled="state.creditsCost > 0"
                  />
                </UFormField>
                <UFormField :label="$t('admin.apis.routing.fields.statisticsEnabled')">
                  <USwitch
                    v-model="state.isStatistics"
                    :disabled="state.creditsCost > 0"
                  />
                </UFormField>
                <UFormField
                  name="creditsCost"
                  :label="$t('admin.apis.routing.fields.creditsCost')"
                  :description="$t('admin.apis.routing.routeForm.creditsCostHelp')"
                >
                  <UInputNumber
                    v-model="state.creditsCost"
                    :min="0"
                    :max="1000000"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <UFormField
                  name="catalogStatus"
                  :label="$t('admin.apis.routing.fields.catalogStatus')"
                  :description="$t('admin.apis.routing.routeForm.catalogStatusHelp')"
                >
                  <USelect
                    v-model="state.catalogStatus"
                    :items="catalogStatusItems"
                    value-key="value"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  name="sensitiveQueryParameters"
                  :label="$t('admin.apis.routing.fields.sensitiveQueryParameters')"
                  :description="$t('admin.apis.routing.routeForm.sensitiveQueryHelp')"
                >
                  <UInputTags
                    v-model="state.sensitiveQueryParameters"
                    :placeholder="$t('admin.apis.routing.routeForm.sensitiveQueryPlaceholder')"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <div class="grid gap-4 sm:grid-cols-4">
                <UFormField name="rateLimitPerSecond" :label="$t('admin.apis.routing.fields.perSecond')">
                  <UInputNumber v-model="state.rateLimitPerSecond" :min="0" class="w-full" />
                </UFormField>
                <UFormField name="rateLimitPerMinute" :label="$t('admin.apis.routing.fields.perMinute')">
                  <UInputNumber v-model="state.rateLimitPerMinute" :min="0" class="w-full" />
                </UFormField>
                <UFormField name="rateLimitPerHour" :label="$t('admin.apis.routing.fields.perHour')">
                  <UInputNumber v-model="state.rateLimitPerHour" :min="0" class="w-full" />
                </UFormField>
                <UFormField name="rateLimitPerDay" :label="$t('admin.apis.routing.fields.perDay')">
                  <UInputNumber v-model="state.rateLimitPerDay" :min="0" class="w-full" />
                </UFormField>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <UFormField name="timeoutMs" :label="$t('admin.apis.routing.fields.timeoutMs')">
                  <UInputNumber
                    v-model="state.timeoutMs"
                    :min="100"
                    :max="120000"
                    :step="100"
                    class="w-full"
                  />
                </UFormField>
                <UFormField name="maxRequestKiB" :label="$t('admin.apis.routing.fields.maxRequestKiB')">
                  <UInputNumber
                    v-model="state.maxRequestKiB"
                    :min="0"
                    :max="1048576"
                    class="w-full"
                  />
                </UFormField>
                <UFormField name="maxResponseKiB" :label="$t('admin.apis.routing.fields.maxResponseKiB')">
                  <UInputNumber
                    v-model="state.maxResponseKiB"
                    :min="0"
                    :max="2097151"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UFormField
                name="state"
                :label="$t('admin.apis.routing.fields.routeState')"
                :description="$t('admin.apis.routing.routeForm.stateHelp')"
              >
                <USelect
                  v-model="state.state"
                  :items="routeStateItems"
                  value-key="value"
                  class="w-full sm:w-64"
                />
              </UFormField>
            </div>
          </template>
        </UCollapsible>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="open = false"
        >
          {{ $t('common.actions.cancel') }}
        </UButton>
        <UButton
          type="submit"
          form="platform-route-form"
          :loading="loading"
          :disabled="versionItems.length === 0 || upstreamItems.length === 0"
        >
          {{ $t(environmentId
            ? 'admin.apis.routing.actions.saveAndPublish'
            : isEditing
              ? 'admin.apis.routing.actions.saveRoute'
              : 'admin.apis.routing.actions.createRoute') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
