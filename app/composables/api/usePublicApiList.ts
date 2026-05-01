import type { ApiCatalogResponse, ApiTabOption } from './types'

const defaultResponse: ApiCatalogResponse = {
  code: 0,
  msg: '',
  data: [],
  timestamp: 0,
}

export function usePublicApiList() {
  const { data, pending, error, refresh } = useAsyncData<ApiCatalogResponse>(
    'public-api-list',
    () => $fetch<ApiCatalogResponse>('/api/list', { method: 'GET' }),
    {
      default: () => defaultResponse,
    },
  )

  const result = computed(() => data.value || defaultResponse)
  const catalogItems = computed(() => result.value.data || [])

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
    pending,
    error,
    fetchPublicApiList: refresh,
  }
}
