// 前端分页：对“一次性全量加载”的后台列表做客户端切片，
// 不改服务端接口（与 customers.vue 模板用 tanstack 客户端分页同思路）。
// 适用于数据量可控、列表一次拿全的页面；服务端分页请用 usePrivatePagedList。

export const DEFAULT_PAGE_SIZE = 20

export const PAGE_SIZE_ITEMS = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 }
]

export function useClientPagination<T>(source: Ref<T[]>, defaultPageSize = 10) {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)

  const total = computed(() => source.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  // 切换每页条数时回到第一页
  watch(pageSize, () => {
    page.value = 1
  })
  // 数据变化（删除 / 刷新 / 过滤）导致当前页越界时回收到最后一页
  watch(total, () => {
    if (page.value > totalPages.value) page.value = totalPages.value
  })

  const paginated = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return source.value.slice(start, start + pageSize.value)
  })

  return { page, pageSize, total, totalPages, paginated }
}
