import { computed, onMounted, ref } from 'vue'
import { usePublicApiList } from './usePublicApiList'
import type { ApiCatalogItem, ApiCategoryItem, ApiTabOption } from './types'

export function useApiList() {
  const { result, statusTabs, fetchPublicApiList } = usePublicApiList()

  const query = ref('')
  const currentTab = ref<string | number>('all')
  const currentCategory = ref<string | number>('all')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const categories = ref<ApiCategoryItem[]>([])

  const allData = computed(() => result.value.data || [])

  const categoryMap = computed(() => {
    const map = new Map<number, ApiCategoryItem>()
    categories.value.forEach(cat => map.set(cat.id, cat))
    return map
  })

  const categoryTabs = computed<ApiTabOption[]>(() => {
    const referenced = new Set<number>()
    allData.value.forEach((item) => {
      if (typeof item.categoryId === 'number') {
        referenced.add(item.categoryId)
      }
    })
    const tabs: ApiTabOption[] = [{ label: '全部', value: 'all' }]
    categories.value
      .filter(cat => referenced.has(cat.id))
      .forEach((cat) => {
        tabs.push({ label: cat.name, value: cat.id })
      })
    return tabs
  })

  const fetchCategories = async () => {
    try {
      const res = await $fetch<{ code: number, data: ApiCategoryItem[] }>('/api/api-categories/list')
      categories.value = res.data || []
    }
    catch {
      categories.value = []
    }
  }

  const fetchList = async () => {
    loading.value = true
    error.value = null
    try {
      const [res] = await Promise.all([fetchPublicApiList(), fetchCategories()])
      result.value = res
    }
    catch (e) {
      error.value = (e && (e as any).message) ? (e as any).message : String(e)
    }
    finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void fetchList()
  })

  const filteredItems = computed(() => {
    const q = query.value.toLowerCase().trim()
    return allData.value.filter((api: ApiCatalogItem) => {
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
    loading,
    error,
    filteredItems,
    isEmpty,
    fetchList,
  }
}
