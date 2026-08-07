import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAdminLogCleanup } from '@/composables/admin/use-admin-log-cleanup'

const addToast = vi.fn()
const fetchCleanup = vi.fn()

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function setupGlobals() {
  vi.stubGlobal('useI18n', () => ({
    t: (key: string, params?: Record<string, unknown>) => params
      ? `${key}:${JSON.stringify(params)}`
      : key
  }))
  vi.stubGlobal('useToast', () => ({ add: addToast }))
  vi.stubGlobal('$fetch', fetchCleanup)
}

describe('useAdminLogCleanup', () => {
  it('keeps false filters and marks a conditional cleanup explicitly', async () => {
    setupGlobals()
    fetchCleanup.mockResolvedValue({ affected: 4 })
    const total = ref(4)
    const refresh = vi.fn().mockResolvedValue(undefined)
    const cleanup = useAdminLogCleanup({
      endpoint: '/api/admin/login-logs/cleanup',
      total,
      applyFilters: vi.fn().mockResolvedValue(undefined),
      refresh,
      buildFilters: () => ({ keyword: '', success: false, types: [] })
    })

    await cleanup.openCleanup()
    expect(cleanup.cleanupHasFilters.value).toBe(true)
    await expect(cleanup.confirmCleanup()).resolves.toBe(true)
    expect(fetchCleanup).toHaveBeenCalledWith('/api/admin/login-logs/cleanup', {
      method: 'POST',
      body: { success: false, confirm: true, deleteAll: false }
    })
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('requires the server-side delete-all flag when no filters are active', async () => {
    setupGlobals()
    fetchCleanup.mockResolvedValue({ affected: 7 })
    const cleanup = useAdminLogCleanup({
      endpoint: '/api/admin/logs/cleanup',
      total: ref(7),
      applyFilters: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn().mockResolvedValue(undefined),
      buildFilters: () => ({ keyword: undefined, types: [] })
    })

    await cleanup.openCleanup()
    expect(cleanup.cleanupHasFilters.value).toBe(false)
    await cleanup.confirmCleanup()
    expect(fetchCleanup).toHaveBeenCalledWith('/api/admin/logs/cleanup', {
      method: 'POST',
      body: { confirm: true, deleteAll: true }
    })
  })

  it('does not open the dialog when the applied filters match no logs', async () => {
    setupGlobals()
    const total = ref(3)
    const cleanup = useAdminLogCleanup({
      endpoint: '/api/admin/operation-logs/cleanup',
      total,
      applyFilters: vi.fn(async () => { total.value = 0 }),
      refresh: vi.fn().mockResolvedValue(undefined),
      buildFilters: () => ({ action: 'admin.' })
    })

    await cleanup.openCleanup()
    expect(cleanup.cleanupOpen.value).toBe(false)
    expect(fetchCleanup).not.toHaveBeenCalled()
    expect(addToast).toHaveBeenCalledWith({
      title: 'admin.logs.cleanup.noMatching',
      color: 'neutral'
    })
  })

  it('does not report a completed deletion as failed when the refresh throws', async () => {
    setupGlobals()
    fetchCleanup.mockResolvedValue({ affected: 2 })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const cleanup = useAdminLogCleanup({
      endpoint: '/api/admin/logs/cleanup',
      total: ref(2),
      applyFilters: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn().mockRejectedValue(new Error('refresh failed')),
      buildFilters: () => ({ keyword: 'api' })
    })

    await cleanup.openCleanup()
    await expect(cleanup.confirmCleanup()).resolves.toBe(true)
    expect(cleanup.cleanupLoading.value).toBe(false)
    expect(addToast).toHaveBeenCalledTimes(1)
    expect(addToast).toHaveBeenCalledWith({
      title: 'admin.logs.cleanup.success:{"count":2}',
      color: 'success'
    })
    expect(consoleError).toHaveBeenCalledOnce()
  })
})
