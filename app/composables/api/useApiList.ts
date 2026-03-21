import { computed, onMounted, ref } from 'vue'
import { usePublicApiList } from './usePublicApiList'
import type { ApiCatalogItem } from './types'

export function useApiList() {
  const { result, fetchPublicApiList } = usePublicApiList()

  const query = ref('')
  const currentTab = ref('all')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const allData = computed(() => result.value.data || [])

  const fetchList = async () => {
    loading.value = true
    error.value = null
    try {
      await fetchPublicApiList()
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
      const matchesQuery = q === '' || (api.name || '').toLowerCase().includes(q) || (api.description || '').toLowerCase().includes(q)
      let matchesTab = true
      if (currentTab.value !== 'all') {
        matchesTab = api.status === parseInt(currentTab.value)
      }
      return matchesQuery && matchesTab
    })
  })

  const isEmpty = computed(() => !loading.value && !error.value && filteredItems.value.length === 0)

  return {
    query,
    currentTab,
    loading,
    error,
    filteredItems,
    isEmpty,
    fetchList,
  }
}