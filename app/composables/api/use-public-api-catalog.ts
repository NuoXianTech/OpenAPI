import type { ApiCatalogItem, ApiCategoryItem } from '#shared/types/api'

export function usePublicApiCatalog() {
  const { t } = useI18n()
  const {
    data: apiData,
    pending: apisPending,
    error: apisError,
    refresh: refreshApis
  } = useFetch<ApiCatalogItem[]>('/api/catalog', {
    key: 'public-api-catalog',
    method: 'GET',
    default: () => []
  })
  const {
    data: categoryData,
    pending: categoriesPending,
    error: categoriesError,
    refresh: refreshCategories
  } = useFetch<ApiCategoryItem[]>('/api/api-categories/list', {
    key: 'public-api-categories',
    default: () => []
  })

  const searchQuery = ref('')
  const selectedCategory = ref<string | number>('all')
  const allApis = computed(() => apiData.value || [])
  const categories = computed(() => categoryData.value || [])
  const isLoading = computed(() => apisPending.value || categoriesPending.value)
  const loadError = computed(() => {
    const error = apisError.value || categoriesError.value
    if (!error) return null
    return error instanceof Error ? error.message : String(error)
  })

  const categoryMap = computed(() => {
    const map: Record<number, ApiCategoryItem> = {}
    categories.value.forEach((category) => {
      map[category.id] = category
    })
    return map
  })

  const categoryTabs = computed(() => {
    const referencedCategoryIds = new Set<number>()
    allApis.value.forEach((api) => {
      if (typeof api.categoryId === 'number') {
        referencedCategoryIds.add(api.categoryId)
      }
    })

    return [
      { label: t('common.filters.all'), value: 'all' },
      ...categories.value
        .filter(category => referencedCategoryIds.has(category.id))
        .map(category => ({ label: category.name, value: category.id }))
    ]
  })

  const filteredApis = computed(() => {
    const query = searchQuery.value.toLowerCase().trim()
    return allApis.value.filter((api) => {
      const matchesQuery = query === ''
        || (api.name || '').toLowerCase().includes(query)
        || (api.apiPath || '').toLowerCase().includes(query)
        || (api.description || '').toLowerCase().includes(query)
        || (api.shortDesc || '').toLowerCase().includes(query)
      const matchesCategory = selectedCategory.value === 'all'
        || api.categoryId === Number(selectedCategory.value)

      return matchesQuery && matchesCategory
    })
  })

  const isEmpty = computed(() => !isLoading.value && !loadError.value && filteredApis.value.length === 0)

  async function refreshCatalog(): Promise<void> {
    await Promise.all([refreshApis(), refreshCategories()])
  }

  return {
    searchQuery,
    selectedCategory,
    categoryTabs,
    categoryMap,
    categories,
    allApis,
    filteredApis,
    isLoading,
    loadError,
    isEmpty,
    refreshCatalog
  }
}
