import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { usePrivatePagedList } from '@/composables/dashboard/use-private-paged-list'

interface TestFilters extends Record<string, unknown> {
  keyword: string
}

interface TestRow {
  id: number
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('usePrivatePagedList', () => {
  it('refreshes with a page reset when page size changes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ items: [{ id: 1 }], total: 1 })
    vi.stubGlobal('$fetch', fetchMock)

    const page = ref(3)
    const pageSize = ref(50)
    const list = usePrivatePagedList<TestFilters, TestRow>({
      path: '/api/example',
      defaultFilters: { keyword: '' },
      immediate: false,
      page,
      pageSize
    })

    pageSize.value = 20
    await nextTick()
    await nextTick()

    expect(page.value).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/example', {
      query: { keyword: '', limit: 20, offset: 0 }
    })
    expect(list.items.value).toEqual([{ id: 1 }])
  })

  it('keeps only the latest response and exposes the latest error', async () => {
    const first = deferred<{ items: TestRow[], total: number }>()
    const second = deferred<{ items: TestRow[], total: number }>()
    const fetchMock = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    vi.stubGlobal('$fetch', fetchMock)

    const list = usePrivatePagedList<TestFilters, TestRow>({
      path: '/api/example',
      defaultFilters: { keyword: '' },
      immediate: false
    })

    const firstRefresh = list.refresh()
    const secondRefresh = list.refresh()

    second.resolve({ items: [{ id: 2 }], total: 1 })
    await secondRefresh
    first.resolve({ items: [{ id: 1 }], total: 1 })
    await firstRefresh

    expect(list.items.value).toEqual([{ id: 2 }])
    expect(list.total.value).toBe(1)
    expect(list.error.value).toBeNull()

    fetchMock.mockRejectedValueOnce(new Error('network down'))
    await list.refresh()

    expect(list.status.value).toBe('error')
    expect(list.error.value).toBeInstanceOf(Error)
  })

  it('moves back to the last available page when refreshed data shrinks', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ items: [], total: 20 })
      .mockResolvedValueOnce({ items: [{ id: 20 }], total: 20 })
    vi.stubGlobal('$fetch', fetchMock)

    const page = ref(3)
    const pageSize = ref(10)
    const list = usePrivatePagedList<TestFilters, TestRow>({
      path: '/api/example',
      defaultFilters: { keyword: '' },
      immediate: false,
      page,
      pageSize
    })

    await list.refresh()
    await nextTick()

    expect(page.value).toBe(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/example', {
      query: { keyword: '', limit: 10, offset: 20 }
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/example', {
      query: { keyword: '', limit: 10, offset: 10 }
    })
    expect(list.items.value).toEqual([{ id: 20 }])
    expect(list.total.value).toBe(20)
  })
})
