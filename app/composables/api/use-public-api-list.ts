import type { ApiCatalogItem } from '~/types/api'
import type { FilterTabOption } from '~/types/ui'
import { PUBLIC_API_STATUS_FILTER_ITEMS } from '#shared/config/api-status'

export function usePublicApiList() {
  const { data, pending, error, refresh } = useFetch<ApiCatalogItem[]>(
    '/api/list',
    {
      key: 'public-api-list',
      method: 'GET',
      default: () => []
    }
  )

  const catalogItems = computed(() => data.value || [])
  // 兼容旧调用方 result.value.data：仍提供同形结构
  const result = computed(() => ({ data: catalogItems.value }))

  const statusTabs: FilterTabOption[] = [
    { label: '全部', value: 'all' },
    ...PUBLIC_API_STATUS_FILTER_ITEMS
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
