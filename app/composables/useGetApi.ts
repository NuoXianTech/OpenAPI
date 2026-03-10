interface ApiDataItem {
  id: number
  name: string
  description: string
  docurl: string
  url: string
  method: string
  count: string
  status: number
}

interface ApiResponse {
  code: number
  msg: string
  data: ApiDataItem[]
  timestamp: number
}

const defaultResponse: ApiResponse = {
  code: 0,
  msg: '',
  data: [],
  timestamp: Date.now(),
}

export function useGetApi() {
  const result = ref<ApiResponse>(defaultResponse)

  const getApi = async () => {
    try {
      const res = await $fetch<ApiResponse>('/api/v1/test/getApiDB', {
        method: 'GET',
      })
      result.value = res
    }
    catch (error: unknown) {
      const endpoint = '/api/v1/test/getApiDB'
      let status: number | undefined

      if (typeof error === 'object' && error !== null) {
        const err = error as { response?: { status?: number }, status?: number }
        status = err.response?.status ?? err.status
      }
      console.error(
        `Error fetching data from ${endpoint}${status ? ` (status: ${status})` : ''} in useGetApi:`,
        error,
      )
      // 保持返回值为默认结构，避免上层组件因 null 访问属性时报错
      result.value = defaultResponse
    }
  }

  return {
    result,
    getApi,
  }
}
