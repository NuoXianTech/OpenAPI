import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import {
  createNumberQueryCodec,
  createStringArrayQueryCodec,
  createStringQueryCodec,
  useDashboardListState
} from '../../../../app/composables/dashboard/useDashboardListState'

interface TestFilters extends Record<string, unknown> {
  apiId: number
  keyword: string
  types: string[]
}

describe('dashboard list query codecs', () => {
  it('parses invalid numbers back to the default value', () => {
    const codec = createNumberQueryCodec(0)

    expect(codec.parse('42')).toBe(42)
    expect(codec.parse('bad')).toBe(0)
    expect(codec.parse(undefined)).toBe(0)
    expect(codec.serialize(0)).toBeUndefined()
    expect(codec.serialize(7)).toBe(7)
  })

  it('serializes string arrays as comma-separated values', () => {
    const codec = createStringArrayQueryCodec([])

    expect(codec.parse('consume,error')).toEqual(['consume', 'error'])
    expect(codec.parse(['consume', 'error'])).toEqual(['consume', 'error'])
    expect(codec.serialize([])).toBeUndefined()
    expect(codec.serialize(['consume', 'error'])).toBe('consume,error')
  })
})

describe('useDashboardListState', () => {
  it('hydrates filters and pagination from query values', () => {
    const query = ref<Record<string, unknown>>({
      page: '3',
      pageSize: '20',
      apiId: '9',
      keyword: 'request-1',
      types: 'consume,error'
    })

    const state = useDashboardListState<TestFilters>({
      defaultFilters: { apiId: 0, keyword: '', types: [] },
      defaultPageSize: 50,
      routeQuery: query,
      filterCodecs: {
        apiId: createNumberQueryCodec(0),
        keyword: createStringQueryCodec(''),
        types: createStringArrayQueryCodec([])
      }
    })

    expect(state.page.value).toBe(3)
    expect(state.pageSize.value).toBe(20)
    expect(state.filters.apiId).toBe(9)
    expect(state.filters.keyword).toBe('request-1')
    expect(state.filters.types).toEqual(['consume', 'error'])
  })

  it('resets filters, resets to page one, and writes compact query values', async () => {
    const replaceQuery = vi.fn()
    const state = useDashboardListState<TestFilters>({
      defaultFilters: { apiId: 0, keyword: '', types: [] },
      defaultPageSize: 50,
      replaceQuery,
      filterCodecs: {
        apiId: createNumberQueryCodec(0),
        keyword: createStringQueryCodec(''),
        types: createStringArrayQueryCodec([])
      }
    })

    state.filters.apiId = 12
    state.filters.keyword = 'abc'
    state.filters.types = ['consume']
    state.page.value = 4
    await state.applyFilters()

    expect(state.page.value).toBe(1)
    expect(replaceQuery).toHaveBeenLastCalledWith({
      apiId: 12,
      keyword: 'abc',
      types: 'consume'
    })

    await state.resetFilters()

    expect(state.filters).toMatchObject({ apiId: 0, keyword: '', types: [] })
    expect(state.page.value).toBe(1)
    expect(replaceQuery).toHaveBeenLastCalledWith({})
  })

  it('resets page and syncs query when page size changes', async () => {
    const replaceQuery = vi.fn()
    const state = useDashboardListState<TestFilters>({
      defaultFilters: { apiId: 0, keyword: '', types: [] },
      defaultPageSize: 50,
      replaceQuery,
      filterCodecs: {
        apiId: createNumberQueryCodec(0),
        keyword: createStringQueryCodec(''),
        types: createStringArrayQueryCodec([])
      }
    })

    state.page.value = 3
    await nextTick()
    state.pageSize.value = 20
    await nextTick()

    expect(state.page.value).toBe(1)
    expect(replaceQuery).toHaveBeenLastCalledWith({ pageSize: 20 })
  })
})
