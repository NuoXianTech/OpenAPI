import { computed, onMounted, ref } from 'vue'
import { usePublicApiList } from './usePublicApiList'
import type { ApiCatalogItem, ApiTabOption } from './types'

export function useApiList() {
  const { result, catalogItems, statusTabs, fetchPublicApiList } = usePublicApiList()

  const query = ref('')
  const currentTab = ref<string | number>('all')
  const currentCategory = ref('all')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const allData = computed(() => result.value.data || [])

  const categoryTabs = computed<ApiTabOption[]>(() => {
    const categories = new Set<string>()
    catalogItems.value.forEach((item) => {
      (item.category || '')
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
        .forEach((category) => {
          categories.add(category)
        })
    })

    return [
      { label: '全部', value: 'all' },
      ...Array.from(categories).sort((left, right) => left.localeCompare(right, 'zh-Hans-CN')).map(category => ({
        label: category,
        value: category,
      })),
    ]
  })

  const fetchList = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await fetchPublicApiList()
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
        || (api.category || '').toLowerCase().includes(q)

      const matchesStatus = currentTab.value === 'all' || api.status === Number(currentTab.value)
      const categories = (api.category || '').split(',').map(item => item.trim()).filter(Boolean)
      const matchesCategory = currentCategory.value === 'all' || categories.includes(currentCategory.value)

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
    loading,
    error,
    filteredItems,
    isEmpty,
    fetchList,
  }
}