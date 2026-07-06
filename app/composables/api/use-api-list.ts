import { PUBLIC_API_STATUS_FILTER_ITEMS } from '~/config/api-status'
import type { ApiCatalogItem, ApiCategoryItem, FilterTabOption } from '~/types'

export function useApiList() {
  const { data: listData, pending: listPending, error: listError, refresh: refreshList } = useFetch<ApiCatalogItem[]>(
    '/api/list',
    {
      key: 'public-api-list',
      method: 'GET',
      default: () => []
    }
  )

  const query = ref('')
  const currentTab = ref<string | number>('all')
  const currentCategory = ref<string | number>('all')
  const catalogItems = computed(() => listData.value || [])

  const statusTabs: FilterTabOption[] = [
    { label: '全部', value: 'all' },
    ...PUBLIC_API_STATUS_FILTER_ITEMS
  ]

  const { data: categoriesData, pending: categoriesPending, error: categoriesError, refresh: refreshCategories } = useFetch<ApiCategoryItem[]>(
    '/api/api-categories/list',
    {
      key: 'public-api-categories',
      default: () => [] as ApiCategoryItem[]
    }
  )

  const categories = computed(() => categoriesData.value || [])

  const loading = computed(() => listPending.value || categoriesPending.value)
  const error = computed(() => {
    const err = listError.value || categoriesError.value
    if (!err) return null
    return err instanceof Error ? err.message : String(err)
  })

  const categoryMap = computed(() => {
    const map: Record<number, ApiCategoryItem> = {}
    categories.value.forEach((cat) => {
      map[cat.id] = cat
    })
    return map
  })

  const categoryTabs = computed<FilterTabOption[]>(() => {
    const referenced = new Set<number>()
    catalogItems.value.forEach((item) => {
      if (typeof item.categoryId === 'number') {
        referenced.add(item.categoryId)
      }
    })
    const tabs: FilterTabOption[] = [{ label: '全部', value: 'all' }]
    categories.value
      .filter(cat => referenced.has(cat.id))
      .forEach((cat) => {
        tabs.push({ label: cat.name, value: cat.id })
      })
    return tabs
  })

  const fetchList = async () => {
    await Promise.all([refreshList(), refreshCategories()])
  }

  const filteredItems = computed(() => {
    const q = query.value.toLowerCase().trim()
    return catalogItems.value.filter((api: ApiCatalogItem) => {
      const matchesQuery = q === ''
        || (api.name || '').toLowerCase().includes(q)
        || (api.description || '').toLowerCase().includes(q)
        || (api.shortDesc || '').toLowerCase().includes(q)

      const matchesStatus = currentTab.value === 'all' || api.status === Number(currentTab.value)
      const matchesCategory = currentCategory.value === 'all' || api.categoryId === Number(currentCategory.value)

      return matchesQuery && matchesStatus && matchesCategory
    })
  })

  const isEmpty = computed(() => !loading.value && !error.value && filteredItems.value.length === 0)

  return {
    query,
    currentTab,
    currentCategory,
    statusTabs,
    categoryTabs,
    categoryMap,
    categories,
    allItems: catalogItems,
    loading,
    error,
    filteredItems,
    isEmpty,
    fetchList
  }
}
