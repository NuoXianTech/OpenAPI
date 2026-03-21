import type { ApiCatalogResponse } from './types'

const defaultResponse: ApiCatalogResponse = {
  code: 0,
  msg: '',
  data: [],
  timestamp: Date.now(),
}

export function usePublicApiList() {
  const result = ref<ApiCatalogResponse>(defaultResponse)

  const fetchPublicApiList = async () => {
    try {
      const res = await $fetch<ApiCatalogResponse>('/api/list', {
        method: 'GET',
      })
      result.value = res
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
    }
  }

  return {
    result,
    fetchPublicApiList,
  }
}