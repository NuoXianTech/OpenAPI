import type { AsyncDataRequestStatus } from '#app'
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
  type ComputedRef,
  type Ref
} from 'vue'

export interface PrivatePagedPagination {
  page: number
  limit: number
  offset: number
}

interface UsePrivatePagedListOptions<
  TFilters extends object,
  TItem
> {
  path: string
  defaultFilters: TFilters
  defaultPageSize?: number
  // 默认 true：组件挂载后（仅客户端）自动拉首屏；false 时需调用方自行触发 refresh / applyFilters。
  immediate?: boolean
  // 与 useDashboardListState 配合时可传入外部状态，确保筛选、分页和 URL 查询只有一份来源。
  filters?: TFilters
  page?: Ref<number>
  pageSize?: Ref<number>
  // 把 filters + 分页拼成最终 query；缺省直接展开 filters 并附加 limit/offset。
  buildQuery?: (filters: TFilters, pagination: PrivatePagedPagination) => Record<string, unknown>
  // 把响应映射成 { items, total }；缺省：数组 → items=数组、total=length；对象 → 取 { items, total }。
  transform?: (resp: unknown) => { items: TItem[], total: number }
}

interface UsePrivatePagedListReturn<TFilters, TItem> {
  filters: TFilters
  page: Ref<number>
  pageSize: Ref<number>
  items: Ref<TItem[]>
  total: Ref<number>
  totalPages: ComputedRef<number>
  status: Ref<AsyncDataRequestStatus>
  loading: ComputedRef<boolean>
  error: Ref<unknown>
  refresh: () => Promise<void>
  applyFilters: () => Promise<void>
  reset: () => Promise<void>
}

function defaultTransform<TItem>(resp: unknown): { items: TItem[], total: number } {
  if (Array.isArray(resp)) return { items: resp as TItem[], total: resp.length }
  const r = resp as { items?: TItem[], total?: number } | null
  return { items: r?.items ?? [], total: r?.total ?? 0 }
}

/**
 * 私有（登录态 / per-user / 后台敏感）分页列表的统一封装：filters + page + pageSize → query → 拉取。
 *
 * 关键约定 —— 用 $fetch 而非 useFetch / useLazyFetch：后者经 useAsyncData 把响应写进 nuxt payload，
 * 会让私有数据进入可被上游缓存的 HTML（见 feedback_nuxt_ssr_private_state）。这里：
 *   1. 用普通 ref 存状态，响应永不进 payload；
 *   2. 仅客户端（onMounted）触发拉取，SSR 阶段只渲染 loading 占位，HTML 里没有任何数据行；
 *   3. immediate 时 status 初值即 'pending'，让 SSR 首帧直接渲染 loading 而非空态，避免客户端补拉前的空态闪烁。
 *
 * 故意保留 watch:false 语义（不监听 filters）：输入框逐字符不触发查询，由 applyFilters / reset 显式刷新；
 * 翻页通过 watch(page) 触发。并发或快慢乱序时用 requestSeq 只采用最新一次结果，旧响应直接丢弃。
 */
export function usePrivatePagedList<
  TFilters extends object,
  TItem = unknown
>(options: UsePrivatePagedListOptions<TFilters, TItem>): UsePrivatePagedListReturn<TFilters, TItem> {
  const {
    path,
    defaultFilters,
    defaultPageSize = 50,
    immediate = true,
    filters: externalFilters,
    page: externalPage,
    pageSize: externalPageSize,
    buildQuery,
    transform
  } = options

  const doTransform = transform ?? defaultTransform<TItem>

  const filters = externalFilters ?? (reactive({ ...defaultFilters }) as TFilters)
  const page = externalPage ?? ref(1)
  const pageSize = externalPageSize ?? ref(defaultPageSize)
  const items = ref<TItem[]>([]) as Ref<TItem[]>
  const total = ref(0)
  const status = ref<AsyncDataRequestStatus>(immediate ? 'pending' : 'idle')
  const error = ref<unknown>(null)

  const loading = computed(() => status.value === 'pending')
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  // 请求序号：并发 / 快慢乱序时只采用最新一次请求的结果，避免旧响应覆盖新数据。
  let requestSeq = 0
  let skipNextPageRefresh = false

  function resetPageWithoutAutoRefresh() {
    if (page.value === 1) return
    skipNextPageRefresh = true
    page.value = 1
  }

  async function refresh() {
    const seq = ++requestSeq
    status.value = 'pending'
    error.value = null
    const limit = pageSize.value
    const offset = (page.value - 1) * limit
    const query = buildQuery
      ? buildQuery(filters, { page: page.value, limit, offset })
      : { ...filters, limit, offset }
    try {
      const resp = await $fetch(path, { query })
      if (seq !== requestSeq) return
      const result = doTransform(resp)
      items.value = result.items
      total.value = result.total
      status.value = 'success'
    } catch (err) {
      if (seq !== requestSeq) return
      items.value = []
      total.value = 0
      error.value = err
      status.value = 'error'
    }
  }

  async function applyFilters() {
    resetPageWithoutAutoRefresh()
    await refresh()
  }

  async function reset() {
    Object.assign(filters, defaultFilters)
    resetPageWithoutAutoRefresh()
    await refresh()
  }

  watch(page, () => {
    if (skipNextPageRefresh) {
      skipNextPageRefresh = false
      return
    }
    void refresh()
  })

  watch(pageSize, () => {
    resetPageWithoutAutoRefresh()
    void refresh()
  })

  if (immediate) {
    // onMounted 天然只在客户端触发，保证私有数据不在 SSR 阶段拉取 / 落入 HTML。
    onMounted(() => { void refresh() })
  }

  return {
    filters,
    page,
    pageSize,
    items,
    total,
    totalPages,
    status,
    loading,
    error,
    refresh,
    applyFilters,
    reset
  }
}
