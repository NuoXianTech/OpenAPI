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

describe('useDashboardListState', () => {
  it('hydrates, syncs, resets, and serializes compact query values', async () => {
    const numberCodec = createNumberQueryCodec(0)
    const arrayCodec = createStringArrayQueryCodec([])

    expect(numberCodec.parse('bad')).toBe(0)
    expect(numberCodec.serialize(0)).toBeUndefined()
    expect(arrayCodec.parse('consume,error')).toEqual(['consume', 'error'])
    expect(arrayCodec.serialize(['consume', 'error'])).toBe('consume,error')

    const replaceQuery = vi.fn()
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
      replaceQuery,
      filterCodecs: {
        apiId: numberCodec,
        keyword: createStringQueryCodec(''),
        types: arrayCodec
      }
    })

    expect(state.page.value).toBe(3)
    expect(state.pageSize.value).toBe(20)
    expect(state.filters.apiId).toBe(9)
    expect(state.filters.keyword).toBe('request-1')
    expect(state.filters.types).toEqual(['consume', 'error'])

    state.filters.apiId = 12
    state.filters.keyword = 'abc'
    state.filters.types = ['consume']
    state.page.value = 4
    await state.applyFilters()

    expect(state.page.value).toBe(1)
    expect(replaceQuery).toHaveBeenLastCalledWith({
      apiId: 12,
      keyword: 'abc',
      pageSize: 20,
      types: 'consume'
    })

    await state.resetFilters()

    expect(state.filters).toMatchObject({ apiId: 0, keyword: '', types: [] })
    expect(state.page.value).toBe(1)
    expect(replaceQuery).toHaveBeenLastCalledWith({ pageSize: 20 })

    state.page.value = 3
    await nextTick()
    state.pageSize.value = 25
    await nextTick()

    expect(state.page.value).toBe(1)
    expect(replaceQuery).toHaveBeenLastCalledWith({ pageSize: 25 })
  })
})
