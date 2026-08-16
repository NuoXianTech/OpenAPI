import { useAdminPlatformContext } from '~/composables/admin/use-admin-platform-context'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import type {
  PlatformEndpointCatalog,
  PlatformEndpointCatalogItem,
  PlatformEndpointCatalogService,
  PlatformEndpointPublicationResult,
  PlatformProduct,
  PlatformRouteBinding
} from '~/types/platform'
import { parseFetchError } from '~/utils/client-error'

function emptyCatalog(): PlatformEndpointCatalog {
  return {
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
  }
}

export function useAdminEndpointCatalogPage() {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const context = useAdminPlatformContext()
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

  const catalog = computed(() => catalogResource.data.value)
  const products = computed(() => productsResource.data.value.filter(
    product => product.workspaceId === context.selectedWorkspaceId.value
  ))
  const upstreams = computed(() => (
    catalog.value.services
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
    return catalog.value.services
      .filter(service => (
        !focusedUpstreamId.value
        || service.upstream.id === focusedUpstreamId.value
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
    if (
      !context.selectedWorkspaceId.value
      || !context.selectedEnvironmentId.value
    ) return
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
        internalUpstreams.value.map(
          upstream => discoverService(upstream.id, true)
        )
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

  function resetFilters() {
    search.value = ''
    statusFilter.value = 'all'
  }

  return {
    catalog,
    clearFocusedService,
    context,
    discoverAllServices,
    discoverService,
    editingRoute,
    focusedUpstreamId,
    handlePrimaryAction,
    internalUpstreams,
    isBusy,
    loading,
    openCreateRoute,
    openEditRoute,
    products,
    refresh,
    refreshAfterMutation,
    resetFilters,
    resourceError,
    routeModalOpen,
    search,
    statusFilter,
    statusItems,
    updatePublication,
    upstreams,
    visibleServices
  }
}
