import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { usePrivateResource } from '@/composables/dashboard/use-private-resource'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePrivateResource', () => {
  it('resolves reactive request inputs for every refresh', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 })
    vi.stubGlobal('$fetch', fetchMock)

    const path = ref('/api/first')
    const query = ref<Record<string, unknown>>({ scope: 'first' })
    const resource = usePrivateResource({
      path: () => path.value,
      query,
      defaultData: () => ({ id: 0 }),
      immediate: false
    })

    await resource.refresh()
    path.value = '/api/second'
    query.value = { scope: 'second' }
    await resource.refresh()

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/first', {
      query: { scope: 'first' },
      signal: expect.objectContaining({ aborted: false }),
      timeout: 15_000
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/second', {
      query: { scope: 'second' },
      signal: expect.objectContaining({ aborted: false }),
      timeout: 15_000
    })
    expect(resource.data.value).toEqual({ id: 2 })
    expect(resource.status.value).toBe('success')
  })

  it('aborts an obsolete request and keeps the latest result', async () => {
    let firstSignal: AbortSignal | undefined
    const fetchMock = vi.fn()
      .mockImplementationOnce((
        _path: string,
        options: { signal: AbortSignal }
      ) => {
        firstSignal = options.signal
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          }, { once: true })
        })
      })
      .mockResolvedValueOnce({ id: 2 })
    vi.stubGlobal('$fetch', fetchMock)

    const resource = usePrivateResource({
      path: '/api/example',
      defaultData: () => ({ id: 0 }),
      immediate: false
    })

    const obsoleteRefresh = resource.refresh()
    const latestRefresh = resource.refresh()
    await Promise.all([obsoleteRefresh, latestRefresh])

    expect(firstSignal?.aborted).toBe(true)
    expect(resource.data.value).toEqual({ id: 2 })
    expect(resource.status.value).toBe('success')
    expect(resource.error.value).toBeNull()
  })

  it('leaves the loading state when a request fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('$fetch', fetchMock)

    const resource = usePrivateResource({
      path: '/api/example',
      defaultData: () => null,
      immediate: false,
      timeoutMs: 5_000
    })

    await resource.refresh()

    expect(fetchMock).toHaveBeenCalledWith('/api/example', {
      query: undefined,
      signal: expect.objectContaining({ aborted: false }),
      timeout: 5_000
    })
    expect(resource.loading.value).toBe(false)
    expect(resource.status.value).toBe('error')
    expect(resource.error.value).toBeInstanceOf(Error)
  })
})
