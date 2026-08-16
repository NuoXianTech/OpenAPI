import { API_STATUS } from '#shared/config/api-status'
import type { ApiCatalogPage, ApiCategoryItem } from '#shared/types/api'

interface PublicApiCatalogOptions {
  pageSize?: number
}

export function usePublicApiCatalog(options: PublicApiCatalogOptions = {}) {
  const { t } = useI18n()
  const searchQuery = ref('')
  const selectedStatus = ref<string | number>('all')
  const selectedCategory = ref<string | number>('all')
  const page = ref(1)
  const pageSize = ref(options.pageSize ?? 24)
  const debouncedSearch = refDebounced(searchQuery, 250)

  const catalogQuery = computed(() => ({
    keyword: debouncedSearch.value.trim() || undefined,
    status: selectedStatus.value === 'all' ? undefined : Number(selectedStatus.value),
    categoryId: selectedCategory.value === 'all' ? undefined : Number(selectedCategory.value),
    page: page.value,
    pageSize: pageSize.value
  }))

  const {
    data: apiData,
    pending: apisPending,
    error: apisError,
    refresh: refreshApis
  } = useFetch<ApiCatalogPage>('/api/catalog', {
    key: `public-api-catalog-${pageSize.value}`,
    method: 'GET',
    query: catalogQuery,
    default: () => ({ items: [], total: 0, page: 1, pageSize: pageSize.value })
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

  watch([debouncedSearch, selectedStatus, selectedCategory, pageSize], () => {
    page.value = 1
  })

  const allApis = computed(() => apiData.value?.items ?? [])
  const filteredApis = allApis
  const total = computed(() => apiData.value?.total ?? 0)
  const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize.value), 1))
  const categories = computed(() => categoryData.value || [])
  const isLoading = computed(() => apisPending.value || categoriesPending.value)
  const loadError = computed(() => {
    const error = apisError.value || categoriesError.value
    if (!error) return null
    return error instanceof Error ? error.message : String(error)
  })

  const categoryMap = computed(() => Object.fromEntries(
    categories.value.map(category => [category.id, category])
  ))
  const categoryTabs = computed(() => [
    { label: t('common.filters.all'), value: 'all' },
    ...categories.value.map(category => ({ label: category.name, value: category.id }))
  ])
  const statusTabs = computed(() => [
    { label: t('common.filters.all'), value: 'all' },
    { label: t('common.states.active'), value: API_STATUS.normal },
    { label: t('common.states.inactive'), value: API_STATUS.abnormal },
    { label: t('common.states.maintenance'), value: API_STATUS.maintenance },
    { label: t('common.states.deprecated'), value: API_STATUS.deprecated },
    { label: t('common.states.unknown'), value: API_STATUS.unknown }
  ])
  const isEmpty = computed(() => !isLoading.value && !loadError.value && total.value === 0)

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
    page,
    pageSize,
    total,
    totalPages,
    isLoading,
    loadError,
    isEmpty,
    refreshCatalog
  }
}
