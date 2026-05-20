import type { AsyncDataRequestStatus } from '#app'

export interface AdminPagedPagination {
  page: number
  limit: number
  offset: number
}

export interface UseAdminPagedListOptions<
  TFilters extends Record<string, unknown>,
  TItem
> {
  path: string
  defaultFilters: TFilters
  defaultPageSize?: number
  // 默认 true；设为 false 跳过首次自动 fetch，适用于需要等 prop 填好再触发的场景
  immediate?: boolean
  // 把 filters + 分页拼成最终 query；缺省直接展开 filters 并附加 limit/offset
  buildQuery?: (filters: TFilters, pagination: AdminPagedPagination) => Record<string, unknown>
  // 把响应映射成 { items, total }；缺省：数组 → items=数组、total=length；对象 → 取 { items, total }
  transform?: (resp: unknown) => { items: TItem[], total: number }
}

export interface UseAdminPagedListReturn<TFilters, TItem> {
  filters: TFilters
  page: Ref<number>
  pageSize: Ref<number>
  items: Ref<TItem[]>
  total: Ref<number>
  status: Ref<AsyncDataRequestStatus>
  refresh: () => Promise<void>
  applyFilters: () => Promise<void>
  reset: () => Promise<void>
}

function defaultTransform<TItem>(resp: unknown): { items: TItem[], total: number } {
  if (Array.isArray(resp)) return { items: resp as TItem[], total: resp.length }
  const r = resp as { items?: TItem[], total?: number } | null
  return { items: r?.items ?? [], total: r?.total ?? 0 }
}

// 后台分页列表统一封装：filters + page + pageSize → query → useLazyFetch。
// 故意用 watch:false + 手动 refresh，避免输入框每次按键都触发查询；
// 翻页通过本地 watch 触发，applyFilters/reset 显式 refresh 以保证"查询"按钮总是刷新。
export function useAdminPagedList<
  TFilters extends Record<string, unknown>,
  TItem = unknown
>(options: UseAdminPagedListOptions<TFilters, TItem>): UseAdminPagedListReturn<TFilters, TItem> {
  const {
    path,
    defaultFilters,
    defaultPageSize = 50,
    immediate = true,
    buildQuery,
    transform
  } = options

  const filters = reactive({ ...defaultFilters }) as TFilters
  const page = ref(1)
  const pageSize = ref(defaultPageSize)

  const doTransform = transform ?? defaultTransform<TItem>

  const { data, status, refresh: rawRefresh } = useLazyFetch<{ items: TItem[], total: number }>(path, {
    immediate,
    watch: false,
    default: () => ({ items: [], total: 0 }),
    query: () => {
      const limit = pageSize.value
      const offset = (page.value - 1) * limit
      const raw = buildQuery
        ? buildQuery(filters, { page: page.value, limit, offset })
        : { ...filters, limit, offset }
      return raw as Record<string, unknown>
    },
    transform: (raw: unknown) => doTransform(raw)
  })

  const items = computed<TItem[]>(() => data.value?.items ?? [])
  const total = computed(() => data.value?.total ?? 0)

  async function refresh() {
    await rawRefresh()
  }

  async function applyFilters() {
    page.value = 1
    await refresh()
  }

  async function reset() {
    Object.assign(filters, defaultFilters)
    page.value = 1
    await refresh()
  }

  watch(page, () => { void refresh() })

  return {
    filters,
    page,
    pageSize,
    items,
    total,
    status,
    refresh,
    applyFilters,
    reset
  }
}
