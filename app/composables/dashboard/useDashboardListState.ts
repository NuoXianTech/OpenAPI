import {
  computed,
  reactive,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref
} from 'vue'

export interface DashboardQueryCodec<TValue> {
  parse: (value: unknown) => TValue
  serialize: (value: TValue) => string | number | undefined
}

export type DashboardListQueryCodecs<TFilters extends Record<string, unknown>> = {
  [K in keyof TFilters]?: DashboardQueryCodec<TFilters[K]>
}

export interface UseDashboardListStateOptions<TFilters extends Record<string, unknown>> {
  defaultFilters: TFilters
  defaultPage?: number
  defaultPageSize?: number
  pageQueryKey?: string
  pageSizeQueryKey?: string
  routeQuery?: MaybeRefOrGetter<Record<string, unknown>>
  replaceQuery?: (query: Record<string, string | number>) => void | Promise<void>
  filterCodecs?: DashboardListQueryCodecs<TFilters>
}

export interface UseDashboardListStateReturn<TFilters extends Record<string, unknown>> {
  filters: TFilters
  page: Ref<number>
  pageSize: Ref<number>
  activeQuery: Readonly<Ref<Record<string, string | number>>>
  applyFilters: () => Promise<void>
  resetFilters: () => Promise<void>
  syncQuery: () => Promise<void>
}

function cloneFilters<TFilters extends Record<string, unknown>>(filters: TFilters): TFilters {
  return structuredClone(filters)
}

function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(firstQueryValue(value))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function createNumberQueryCodec(defaultValue = 0): DashboardQueryCodec<number> {
  return {
    parse(value) {
      const parsed = Number(firstQueryValue(value))
      return Number.isFinite(parsed) ? parsed : defaultValue
    },
    serialize(value) {
      return value === defaultValue ? undefined : value
    }
  }
}

export function createStringQueryCodec(defaultValue = ''): DashboardQueryCodec<string> {
  return {
    parse(value) {
      return String(firstQueryValue(value) ?? defaultValue)
    },
    serialize(value) {
      const trimmed = value.trim()
      return trimmed === '' || trimmed === defaultValue ? undefined : trimmed
    }
  }
}

export function createStringArrayQueryCodec(defaultValue: string[] = []): DashboardQueryCodec<string[]> {
  return {
    parse(value) {
      const values = Array.isArray(value) ? value : String(value ?? '').split(',')
      return values
        .flatMap(item => String(item).split(','))
        .map(item => item.trim())
        .filter(Boolean)
    },
    serialize(value) {
      const isDefault = value.length === defaultValue.length
        && value.every((item, index) => item === defaultValue[index])
      return isDefault ? undefined : value.join(',')
    }
  }
}

export function useDashboardListState<TFilters extends Record<string, unknown>>(
  options: UseDashboardListStateOptions<TFilters>
): UseDashboardListStateReturn<TFilters> {
  const {
    defaultFilters,
    defaultPage = 1,
    defaultPageSize = 50,
    pageQueryKey = 'page',
    pageSizeQueryKey = 'pageSize',
    routeQuery,
    replaceQuery,
    filterCodecs
  } = options

  const initialQuery = routeQuery ? toValue(routeQuery) : {}
  const codecs = (filterCodecs ?? {}) as DashboardListQueryCodecs<TFilters>
  const filters = reactive(cloneFilters(defaultFilters)) as TFilters
  const page = ref(parsePositiveInteger(initialQuery[pageQueryKey], defaultPage))
  const pageSize = ref(parsePositiveInteger(initialQuery[pageSizeQueryKey], defaultPageSize))

  for (const key of Object.keys(defaultFilters) as Array<keyof TFilters>) {
    const codec = codecs[key]
    const queryKey = String(key)
    if (codec && Object.prototype.hasOwnProperty.call(initialQuery, queryKey)) {
      filters[key] = codec.parse(initialQuery[queryKey]) as TFilters[keyof TFilters]
    }
  }

  const activeQuery = computed<Record<string, string | number>>(() => {
    const query: Record<string, string | number> = {}

    if (page.value !== defaultPage) query[pageQueryKey] = page.value
    if (pageSize.value !== defaultPageSize) query[pageSizeQueryKey] = pageSize.value

    for (const key of Object.keys(defaultFilters) as Array<keyof TFilters>) {
      const codec = codecs[key]
      if (!codec) continue

      const serialized = codec.serialize(filters[key])
      if (serialized !== undefined) query[String(key)] = serialized
    }

    return query
  })

  async function syncQuery() {
    await replaceQuery?.(activeQuery.value)
  }

  async function applyFilters() {
    page.value = defaultPage
    await syncQuery()
  }

  async function resetFilters() {
    const next = cloneFilters(defaultFilters)
    for (const key of Object.keys(next) as Array<keyof TFilters>) {
      filters[key] = next[key]
    }
    page.value = defaultPage
    await syncQuery()
  }

  watch(page, () => {
    void syncQuery()
  })

  watch(pageSize, () => {
    page.value = defaultPage
    void syncQuery()
  })

  return {
    filters,
    page,
    pageSize,
    activeQuery,
    applyFilters,
    resetFilters,
    syncQuery
  }
}
