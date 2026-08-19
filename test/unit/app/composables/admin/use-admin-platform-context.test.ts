import { computed, nextTick, reactive, ref, watch } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

const testContext = vi.hoisted(() => ({ resource: null as unknown }))

vi.mock('~/composables/dashboard/use-private-resource', () => ({
  usePrivateResource: () => testContext.resource
}))

const { provideAdminPlatformContext } = await import(
  '@/composables/admin/use-admin-platform-context'
)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('admin platform context', () => {
  it('follows Workspace and Environment changes from browser history', async () => {
    const route = reactive({
      query: { workspaceId: 'workspace-1', environmentId: 'environment-1' }
    })
    const router = { replace: vi.fn() }
    const workspaces = [{
      id: 'workspace-1',
      slug: 'first',
      name: 'First',
      status: 'active' as const,
      createdAt: '',
      updatedAt: '',
      environments: [{
        id: 'environment-1',
        workspaceId: 'workspace-1',
        slug: 'first',
        name: 'First',
        defaultDomain: 'first.example.com',
        activeRevisionId: null,
        status: 'active' as const,
        createdAt: '',
        updatedAt: ''
      }]
    }, {
      id: 'workspace-2',
      slug: 'second',
      name: 'Second',
      status: 'active' as const,
      createdAt: '',
      updatedAt: '',
      environments: [{
        id: 'environment-2',
        workspaceId: 'workspace-2',
        slug: 'second',
        name: 'Second',
        defaultDomain: 'second.example.com',
        activeRevisionId: null,
        status: 'active' as const,
        createdAt: '',
        updatedAt: ''
      }]
    }]
    testContext.resource = {
      data: ref(workspaces),
      status: ref('success'),
      loading: computed(() => false),
      error: ref(null),
      refresh: vi.fn()
    }
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('provide', vi.fn())
    vi.stubGlobal('useRoute', () => route)
    vi.stubGlobal('useRouter', () => router)

    const context = provideAdminPlatformContext()
    expect(context.selectedWorkspaceId.value).toBe('workspace-1')
    expect(context.selectedEnvironmentId.value).toBe('environment-1')

    route.query.workspaceId = 'workspace-2'
    route.query.environmentId = 'environment-2'
    await nextTick()

    expect(context.selectedWorkspaceId.value).toBe('workspace-2')
    expect(context.selectedEnvironmentId.value).toBe('environment-2')
    expect(router.replace).not.toHaveBeenCalled()
  })
})
