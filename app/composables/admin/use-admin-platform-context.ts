import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import type { PlatformEnvironment, PlatformWorkspace } from '#shared/types/platform'

export interface AdminPlatformContext {
  workspaces: ComputedRef<PlatformWorkspace[]>
  selectedWorkspaceId: Ref<string>
  selectedEnvironmentId: Ref<string>
  selectedWorkspace: ComputedRef<PlatformWorkspace | null>
  selectedEnvironment: ComputedRef<PlatformEnvironment | null>
  workspaceItems: ComputedRef<Array<{ label: string, value: string }>>
  environmentItems: ComputedRef<Array<{ label: string, value: string, description: string }>>
  loading: ComputedRef<boolean>
  error: Ref<unknown>
  refresh: () => Promise<void>
}

const adminPlatformContextKey: InjectionKey<AdminPlatformContext> = Symbol('admin-platform-context')

function queryValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function provideAdminPlatformContext(): AdminPlatformContext {
  const route = useRoute()
  const router = useRouter()
  const selectedWorkspaceId = ref(queryValue(route.query.workspaceId))
  const selectedEnvironmentId = ref(queryValue(route.query.environmentId))
  const resource = usePrivateResource<PlatformWorkspace[]>({
    path: '/api/admin/v1/workspaces',
    defaultData: () => []
  })

  const workspaces = computed(() => resource.data.value)
  const selectedWorkspace = computed(() => workspaces.value.find(
    workspace => workspace.id === selectedWorkspaceId.value
  ) ?? null)
  const selectedEnvironment = computed(() => selectedWorkspace.value?.environments.find(
    environment => environment.id === selectedEnvironmentId.value
  ) ?? null)
  const workspaceItems = computed(() => workspaces.value.map(workspace => ({
    label: workspace.name,
    value: workspace.id
  })))
  const environmentItems = computed(() => (selectedWorkspace.value?.environments ?? []).map(environment => ({
    label: environment.name,
    value: environment.id,
    description: environment.defaultDomain || environment.slug
  })))

  watch(
    () => [
      queryValue(route.query.workspaceId),
      queryValue(route.query.environmentId)
    ] as const,
    ([workspaceId, environmentId]) => {
      selectedWorkspaceId.value = workspaceId
      selectedEnvironmentId.value = environmentId
    },
    { immediate: true, flush: 'sync' }
  )

  // 当前选中的 Environment 不属于该 Workspace 时，回落到第一个 active 环境。
  function syncEnvironment(workspace: PlatformWorkspace | undefined): void {
    if (workspace?.environments.some(item => item.id === selectedEnvironmentId.value)) return
    selectedEnvironmentId.value = workspace?.environments.find(
      item => item.status === 'active'
    )?.id ?? workspace?.environments[0]?.id ?? ''
  }

  // 首次加载完成前不自动选中，避免覆盖 URL 带来的 workspaceId。
  watch(
    [workspaces, resource.status, selectedWorkspaceId],
    ([items, status]) => {
      if (status === 'pending') return
      const workspace = items.find(item => item.id === selectedWorkspaceId.value) ?? items[0]
      selectedWorkspaceId.value = workspace?.id ?? ''
      syncEnvironment(workspace)
    },
    { immediate: true }
  )

  // 加载期间切换 Workspace 时上面的 watcher 会提前 return，这里仍要跟随。
  watch(selectedWorkspace, workspace => syncEnvironment(workspace ?? undefined))

  watch(
    [selectedWorkspaceId, selectedEnvironmentId],
    ([workspaceId, environmentId]) => {
      if (
        queryValue(route.query.workspaceId) === workspaceId
        && queryValue(route.query.environmentId) === environmentId
      ) return
      void router.replace({
        query: {
          ...route.query,
          workspaceId: workspaceId || undefined,
          environmentId: environmentId || undefined
        }
      })
    }
  )

  const context: AdminPlatformContext = {
    workspaces,
    selectedWorkspaceId,
    selectedEnvironmentId,
    selectedWorkspace,
    selectedEnvironment,
    workspaceItems,
    environmentItems,
    loading: resource.loading,
    error: resource.error,
    refresh: resource.refresh
  }
  provide(adminPlatformContextKey, context)
  return context
}

export function useAdminPlatformContext(): AdminPlatformContext {
  const context = inject(adminPlatformContextKey)
  if (!context) throw new Error('Admin Platform context is unavailable')
  return context
}
