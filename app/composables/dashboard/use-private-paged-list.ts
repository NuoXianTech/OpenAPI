import type { AsyncDataRequestStatus } from '#app'
import {
  computed,
  getCurrentScope,
  onMounted,
  onScopeDispose,
  reactive,
  ref,
  watch,
  type ComputedRef,
  type Ref
} from 'vue'
import { DEFAULT_PAGE_SIZE } from '~/constants/pagination'

export interface PrivatePagedPagination {
  page: number
  limit: number
  offset: number
}

interface UsePrivatePagedListOptions<TFilters extends object> {
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
  timeoutMs?: number
}

interface UsePrivatePagedListReturn<TFilters, TItem> {
  filters: TFilters
  page: Ref<number>
  pageSize: Ref<number>
  items: Ref<TItem[]>
  total: Ref<number>
  status: Ref<AsyncDataRequestStatus>
  loading: ComputedRef<boolean>
  error: Ref<unknown>
  refresh: () => Promise<void>
  applyFilters: () => Promise<void>
  reset: () => Promise<void>
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
>(options: UsePrivatePagedListOptions<TFilters>): UsePrivatePagedListReturn<TFilters, TItem> {
  const {
    path,
    defaultFilters,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    immediate = true,
    filters: externalFilters,
    page: externalPage,
    pageSize: externalPageSize,
    buildQuery,
    timeoutMs = 15_000
  } = options

  const filters = externalFilters ?? (reactive({ ...defaultFilters }) as TFilters)
  const page = externalPage ?? ref(1)
  const pageSize = externalPageSize ?? ref(defaultPageSize)
  const items = ref<TItem[]>([]) as Ref<TItem[]>
  const total = ref(0)
  const status = ref<AsyncDataRequestStatus>(immediate ? 'pending' : 'idle')
  const error = ref<unknown>(null)

  const loading = computed(() => status.value === 'pending')

  // 请求序号：并发 / 快慢乱序时只采用最新一次请求的结果，避免旧响应覆盖新数据。
  let requestSeq = 0
  let skipNextPageRefresh = false
  let activeController: AbortController | null = null

  function resetPageWithoutAutoRefresh() {
    if (page.value === 1) return
    skipNextPageRefresh = true
    page.value = 1
  }

  async function refresh(): Promise<void> {
    const seq = ++requestSeq
    activeController?.abort()
    const controller = new AbortController()
    activeController = controller
    status.value = 'pending'
    error.value = null
    const limit = pageSize.value
    const offset = (page.value - 1) * limit
    const query = buildQuery
      ? buildQuery(filters, { page: page.value, limit, offset })
      : { ...filters, limit, offset }
    try {
      const result = await $fetch<{ items: TItem[], total: number }>(path, {
        query,
        signal: controller.signal,
        timeout: timeoutMs
      })
      if (seq !== requestSeq) return
      if (!Array.isArray(result.items) || !Number.isFinite(result.total)) {
        throw new TypeError(`Invalid paged response from ${path}`)
      }

      // 删除当前页最后一条数据、筛选结果收缩等场景可能令页码越界。
      // 服务端分页不能像客户端切片那样自行回收到末页，因此在这里统一修正并重拉。
      const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value))
      if (page.value > lastPage) {
        skipNextPageRefresh = true
        page.value = lastPage
        await refresh()
        return
      }

      items.value = result.items
      total.value = result.total
      status.value = 'success'
    } catch (err) {
      if (seq !== requestSeq) return
      items.value = []
      total.value = 0
      error.value = err
      status.value = 'error'
    } finally {
      if (seq === requestSeq && activeController === controller) {
        activeController = null
      }
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

  if (getCurrentScope()) {
    onScopeDispose(() => {
      requestSeq += 1
      activeController?.abort()
      activeController = null
    })
  }

  return {
    filters,
    page,
    pageSize,
    items,
    total,
    status,
    loading,
    error,
    refresh,
    applyFilters,
    reset
  }
}
