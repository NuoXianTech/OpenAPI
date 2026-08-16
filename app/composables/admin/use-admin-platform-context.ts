import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import type { PlatformEnvironment, PlatformWorkspace } from '~/types/platform'

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
    [workspaces, resource.status, selectedWorkspaceId],
    ([items, status]) => {
      if (status === 'pending') return
      const workspace = items.find(item => item.id === selectedWorkspaceId.value) ?? items[0]
      selectedWorkspaceId.value = workspace?.id ?? ''
      if (!workspace?.environments.some(environment => environment.id === selectedEnvironmentId.value)) {
        selectedEnvironmentId.value = workspace?.environments.find(
          environment => environment.status === 'active'
        )?.id ?? workspace?.environments[0]?.id ?? ''
      }
    },
    { immediate: true }
  )

  watch(selectedWorkspace, (workspace) => {
    if (!workspace) {
      selectedEnvironmentId.value = ''
      return
    }
    if (!workspace.environments.some(environment => environment.id === selectedEnvironmentId.value)) {
      selectedEnvironmentId.value = workspace.environments.find(
        environment => environment.status === 'active'
      )?.id ?? workspace.environments[0]?.id ?? ''
    }
  })

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
