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

export type DashboardListQueryCodecs<TFilters extends object> = {
  [K in keyof TFilters]?: DashboardQueryCodec<TFilters[K]>
}

interface UseDashboardListStateOptions<TFilters extends object> {
  defaultFilters: TFilters
  defaultPage?: number
  defaultPageSize?: number
  filterCountKeys?: readonly (keyof TFilters)[]
  pageQueryKey?: string
  pageSizeQueryKey?: string
  routeQuery?: MaybeRefOrGetter<Record<string, unknown>>
  replaceQuery?: (query: Record<string, string | number>) => void | Promise<void>
  filterCodecs?: DashboardListQueryCodecs<TFilters>
}

interface UseDashboardListStateReturn<TFilters extends object> {
  filters: TFilters
  page: Ref<number>
  pageSize: Ref<number>
  activeQuery: Readonly<Ref<Record<string, string | number>>>
  activeFilterCount: Readonly<Ref<number>>
  syncQuery: () => Promise<void>
}

function cloneFilters<TFilters extends object>(filters: TFilters): TFilters {
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

export function createEnumQueryCodec<TValue extends string>(
  values: readonly TValue[],
  defaultValue: TValue
): DashboardQueryCodec<TValue> {
  const allowedValues = new Set(values)

  return {
    parse(value) {
      const parsed = String(firstQueryValue(value) ?? defaultValue) as TValue
      return allowedValues.has(parsed) ? parsed : defaultValue
    },
    serialize(value) {
      return value === defaultValue ? undefined : value
    }
  }
}

export function createStringArrayQueryCodec<TValue extends string = string>(
  defaultValue: readonly TValue[] = [],
  values?: readonly TValue[]
): DashboardQueryCodec<TValue[]> {
  const allowedValues = values ? new Set(values) : null

  return {
    parse(value) {
      const rawValues = Array.isArray(value) ? value : String(value ?? '').split(',')
      const parsed = rawValues
        .flatMap(item => String(item).split(','))
        .map(item => item.trim())
        .filter(Boolean) as TValue[]
      return allowedValues ? parsed.filter(item => allowedValues.has(item)) : parsed
    },
    serialize(value) {
      const isDefault = value.length === defaultValue.length
        && value.every((item, index) => item === defaultValue[index])
      return isDefault ? undefined : value.join(',')
    }
  }
}

export function useDashboardListState<TFilters extends object>(
  options: UseDashboardListStateOptions<TFilters>
): UseDashboardListStateReturn<TFilters> {
  const {
    defaultFilters,
    defaultPage = 1,
    defaultPageSize = 50,
    filterCountKeys,
    pageQueryKey = 'page',
    pageSizeQueryKey = 'pageSize',
    routeQuery,
    replaceQuery,
    filterCodecs
  } = options

  const initialQuery = routeQuery ? toValue(routeQuery) : {}
  const codecs = (filterCodecs ?? {}) as DashboardListQueryCodecs<TFilters>
  const countedFilterKeys = (filterCountKeys ?? Object.keys(defaultFilters)) as readonly (keyof TFilters)[]
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
  const activeFilterCount = computed(() => countedFilterKeys.filter((key) => {
    const codec = codecs[key]
    return codec?.serialize(filters[key]) !== undefined
  }).length)

  async function syncQuery() {
    await replaceQuery?.(activeQuery.value)
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
    activeFilterCount,
    syncQuery
  }
}
