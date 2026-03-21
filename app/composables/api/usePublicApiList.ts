import type { ApiCatalogResponse, ApiTabOption } from './types'

const defaultResponse: ApiCatalogResponse = {
  code: 0,
  msg: '',
  data: [],
  timestamp: Date.now(),
}

export function usePublicApiList() {
  const result = ref<ApiCatalogResponse>(defaultResponse)
  const catalogItems = ref(result.value.data)

  const fetchPublicApiList = async () => {
    try {
      const res = await $fetch<ApiCatalogResponse>('/api/list', {
        method: 'GET',
      })
      result.value = res
      catalogItems.value = res.data || []
      return res
    }
    catch (error: unknown) {
      const endpoint = '/api/list'
      let status: number | undefined

      if (typeof error === 'object' && error !== null) {
        const err = error as { response?: { status?: number }, status?: number }
        status = err.response?.status ?? err.status
      }
      console.error(
        `Error fetching data from ${endpoint}${status ? ` (status: ${status})` : ''} in usePublicApiList:`,
        error,
      )
      result.value = defaultResponse
      throw error
    }
  }

  const statusTabs: ApiTabOption[] = [
    { label: '全部', value: 'all' },
    { label: '正常', value: 1 },
    { label: '异常', value: 0 },
    { label: '维护', value: 2 },
    { label: '废弃', value: 3 },
  ]

  return {
    result,
    catalogItems,
    statusTabs,
    fetchPublicApiList,
  }
}