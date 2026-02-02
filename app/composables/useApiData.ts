// composables/useApiData.ts

// 定义API数据项的接口
interface ApiItem {
  name: string
  description: string
  url: string
  method: string
  status: number
}

export const useApiData = () => {
  const allData = ref<ApiItem[]>([])
  const isLoading = ref<boolean>(true)
  const searchQuery = ref<string>('')
  const currentTab = ref<string>('all')
  const currentPage = ref<number>(1)
  const pageSize: number = 12

  // 获取数据
  const fetchData = async (): Promise<void> => {
    isLoading.value = true
    try {
      // 使用 Nuxt 内置的 $fetch
      const res: ApiItem[] = await $fetch('/data/api-list.json?t=' + Date.now())
      allData.value = res
    } catch (err) {
      console.error("加载失败", err)
      // 模拟数据
      allData.value = [
        { name: '演示API', description: '数据加载失败演示', url: '#', method: 'GET', status: 1 },
        { name: '演示API', description: '数据加载失败演示', url: '#', method: 'GET', status: 0 }
      ]
    } finally {
      setTimeout(() => { isLoading.value = false }, 300)
    }
  }

  // 筛选逻辑
  const filteredData: ComputedRef<ApiItem[]> = computed(() => {
    const query: string = searchQuery.value.toLowerCase().trim()
    return allData.value.filter(item => {
      const matchSearch: boolean = item.name.toLowerCase().includes(query) || 
                          item.description.toLowerCase().includes(query)
      let matchTab: boolean = true
      if (currentTab.value !== 'all') {
        matchTab = item.status === parseInt(currentTab.value)
      }
      return matchSearch && matchTab
    })
  })

  // 分页逻辑
  const totalPages: ComputedRef<number> = computed(() => Math.ceil(filteredData.value.length / pageSize))

  const paginatedData: ComputedRef<ApiItem[]> = computed(() => {
    const start: number = (currentPage.value - 1) * pageSize
    return filteredData.value.slice(start, start + pageSize)
  })

  // 翻页动作
  const changePage = (step: number): void => {
    const newVal: number = currentPage.value + step
    if (newVal >= 1 && newVal <= totalPages.value) {
      currentPage.value = newVal
      // 滚动到顶部稍微靠下一点的位置
      if (import.meta.client) {
         window.scrollTo({ top: 100, behavior: 'smooth' })
      }
    }
  }

  const switchTab = (tab: string): void => {
    currentTab.value = tab
    currentPage.value = 1
  }

  return {
    isLoading,
    searchQuery,
    currentTab,
    currentPage,
    totalPages,
    paginatedData,
    filteredData,
    fetchData,
    changePage,
    switchTab
  }
}
