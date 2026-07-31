import { API_STATUS } from '#shared/config/api-status'
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
  const selectedStatus = ref<string | number>('all')
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

  const statusTabs = computed(() => [
    { label: t('common.filters.all'), value: 'all' },
    { label: t('common.states.active'), value: API_STATUS.normal },
    { label: t('common.states.inactive'), value: API_STATUS.abnormal },
    { label: t('common.states.maintenance'), value: API_STATUS.maintenance },
    { label: t('common.states.deprecated'), value: API_STATUS.deprecated },
    { label: t('common.states.unknown'), value: API_STATUS.unknown }
  ])

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
      const matchesStatus = selectedStatus.value === 'all'
        || api.status === Number(selectedStatus.value)

      return matchesQuery && matchesStatus && matchesCategory
    })
  })

  const isEmpty = computed(() => !isLoading.value && !loadError.value && filteredApis.value.length === 0)

  async function refreshCatalog(): Promise<void> {
    await Promise.all([refreshApis(), refreshCategories()])
  }

  return {
    searchQuery,
    selectedStatus,
    selectedCategory,
    statusTabs,
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
