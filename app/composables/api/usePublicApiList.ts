import type { ApiCatalogItem, ApiTabOption } from './types'

export function usePublicApiList() {
  const { data, pending, error, refresh } = useAsyncData<ApiCatalogItem[]>(
    'public-api-list',
    () => $fetch<ApiCatalogItem[]>('/api/list', { method: 'GET' }),
    {
      default: () => []
    }
  )

  const catalogItems = computed(() => data.value || [])
  // 兼容旧调用方 result.value.data：仍提供同形结构
  const result = computed(() => ({ data: catalogItems.value }))

  const statusTabs: ApiTabOption[] = [
    { label: '全部', value: 'all' },
    { label: '正常', value: 1 },
    { label: '异常', value: 0 },
    { label: '维护', value: 2 },
    { label: '废弃', value: 3 }
  ]

  return {
    result,
    catalogItems,
    statusTabs,
    pending,
    error,
    fetchPublicApiList: refresh
  }
}
