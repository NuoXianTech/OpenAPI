# Frontend Dashboard List Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor high-traffic dashboard list pages around shared, tested list state, private pagination, URL query synchronization, and smaller page components.

**Architecture:** Page components remain orchestration shells. Shared list state lives in `app/composables/dashboard/useDashboardListState.ts`, private fetching remains in `usePrivatePagedList`, and large detail/modals or table helpers move into focused dashboard business files. The first URL-synced migrations are admin and user call logs; admin users and user API keys receive targeted extraction without broad behavior changes.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, TypeScript, Nuxt UI 4, Tailwind CSS 4, VueUse, Vitest, Nuxt test utils.

## Global Constraints

- Preserve existing user-facing behavior for selected pages.
- Keep private list data out of SSR payloads.
- Use TypeScript, interfaces for structured data, named exports, and `function` declarations for pure helpers.
- Do not introduce classes or enums.
- Keep `DashboardDataTable`, `DashboardHeaderActions`, `UserHeaderActions`, `UEmpty`, and Nuxt UI dashboard primitives as the page-level UI foundation.
- Use mobile-first Tailwind utility classes and semantic Nuxt UI theme tokens.
- Do not redesign public pages in this pass.
- Use TDD for production changes: write failing tests before implementation.
- Final verification commands are `pnpm lint`, `pnpm typecheck`, and `pnpm test:run`.

---

## File Map

- Modify `vitest.config.ts`: include app composable unit tests and increase Nuxt test hook timeout.
- Create `tests/app/composables/dashboard/useDashboardListState.test.ts`: unit coverage for query codecs and list state.
- Create `tests/app/composables/dashboard/usePrivatePagedList.test.ts`: unit coverage for page-size refresh, exposed error state, and stale response protection.
- Create `app/composables/dashboard/useDashboardListState.ts`: typed dashboard list state, reset helpers, and optional URL query synchronization.
- Modify `app/composables/dashboard/usePrivatePagedList.ts`: support external state, error ref, page-size refresh, and no duplicate private SSR payload behavior changes.
- Create `app/components/admin/AdminCallLogDetailModal.vue`: admin call-log detail modal extracted from `admin/logs`.
- Create `app/components/user/UserCallLogDetailModal.vue`: user call-log detail modal extracted from `user/logs`.
- Create `app/composables/admin/useAdminCallLogsPage.ts`: admin log filters, columns, query building, and options loading.
- Create `app/composables/user/useUserCallLogsPage.ts`: user log filters, columns, query building, and options loading.
- Modify `app/pages/admin/logs.vue`: use the new admin call-log page composable and detail component.
- Modify `app/pages/user/logs.vue`: use the new user call-log page composable and detail component.
- Modify `app/pages/admin/users/index.vue`: reduce page-local pagination and row-action clutter where it can reuse the shared list state.
- Create `app/components/api-key/ApiKeyResetModal.vue`: extract reset-confirm/result flow from `user/apikeys`.
- Modify `app/pages/user/apikeys.vue`: use the reset modal and keep existing form composables for create/edit.

---

### Task 1: Stabilize Test Configuration

**Files:**
- Modify: `vitest.config.ts`
- Test: `tests/nuxt/runtime.test.ts`

**Interfaces:**
- Consumes: existing Vitest project names `unit` and `nuxt`.
- Produces: unit project includes `tests/app/**/*.{test,spec}.ts`; Nuxt project has enough `hookTimeout` for local setup.

- [ ] **Step 1: Write the failing config expectation**

Update `tests/nuxt/runtime.test.ts` so it stays behavior-focused and still exercises the Nuxt runtime:

```ts
import { describe, expect, it } from 'vitest'
import { useRuntimeConfig } from '#imports'

describe('nuxt test runtime', () => {
  it('loads the application runtime config', () => {
    const config = useRuntimeConfig()

    expect(config.auth).toMatchObject({
      adminUsername: '',
      adminPassword: '',
      adminEmail: '',
      emailVerifySecret: '',
      apiKeySecret: '',
      jwtSecret: ''
    })
  })
})
```

- [ ] **Step 2: Run the currently failing test command**

Run: `pnpm test:run`

Expected before the config change: FAIL with `Hook timed out in 10000ms` from the Nuxt test environment setup.

- [ ] **Step 3: Increase timeout and include app unit tests**

Modify `vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const appDir = fileURLToPath(new URL('./app', import.meta.url))

const aliases = {
  '~~': rootDir,
  '@@': rootDir,
  '~': appDir,
  '@': appDir
}

export default defineConfig({
  test: {
    hookTimeout: 30000,
    projects: [
      {
        resolve: {
          alias: aliases
        },
        test: {
          name: 'unit',
          environment: 'node',
          globals: false,
          include: [
            'tests/server/**/*.{test,spec}.ts',
            'tests/app/**/*.{test,spec}.ts'
          ]
        }
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          environment: 'nuxt',
          globals: false,
          hookTimeout: 30000,
          include: ['tests/nuxt/**/*.{test,spec}.ts'],
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom'
            }
          }
        }
      })
    ]
  }
})
```

- [ ] **Step 4: Verify tests**

Run: `pnpm test:run`

Expected: PASS for existing server tests and `tests/nuxt/runtime.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/nuxt/runtime.test.ts
git commit -m "test: stabilize frontend test runtime"
```

---

### Task 2: Add Dashboard List State Composable

**Files:**
- Create: `tests/app/composables/dashboard/useDashboardListState.test.ts`
- Create: `app/composables/dashboard/useDashboardListState.ts`

**Interfaces:**
- Produces:
  - `DashboardQueryCodec<TValue>`
  - `DashboardListQueryCodecs<TFilters>`
  - `UseDashboardListStateOptions<TFilters>`
  - `UseDashboardListStateReturn<TFilters>`
  - `createNumberQueryCodec(defaultValue?: number)`
  - `createStringQueryCodec(defaultValue?: string)`
  - `createStringArrayQueryCodec(defaultValue?: string[])`
  - `useDashboardListState<TFilters extends Record<string, unknown>>(options)`

- [ ] **Step 1: Write failing tests for codecs and state**

Create `tests/app/composables/dashboard/useDashboardListState.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import {
  createNumberQueryCodec,
  createStringArrayQueryCodec,
  createStringQueryCodec,
  useDashboardListState
} from '../../../../app/composables/dashboard/useDashboardListState'

interface TestFilters extends Record<string, unknown> {
  apiId: number
  keyword: string
  types: string[]
}

describe('dashboard list query codecs', () => {
  it('parses invalid numbers back to the default value', () => {
    const codec = createNumberQueryCodec(0)

    expect(codec.parse('42')).toBe(42)
    expect(codec.parse('bad')).toBe(0)
    expect(codec.serialize(0)).toBeUndefined()
    expect(codec.serialize(7)).toBe(7)
  })

  it('serializes string arrays as comma-separated values', () => {
    const codec = createStringArrayQueryCodec([])

    expect(codec.parse('consume,error')).toEqual(['consume', 'error'])
    expect(codec.parse(['consume', 'error'])).toEqual(['consume', 'error'])
    expect(codec.serialize([])).toBeUndefined()
    expect(codec.serialize(['consume', 'error'])).toBe('consume,error')
  })
})

describe('useDashboardListState', () => {
  it('hydrates filters and pagination from query values', () => {
    const query = ref<Record<string, unknown>>({
      page: '3',
      pageSize: '20',
      apiId: '9',
      keyword: 'request-1',
      types: 'consume,error'
    })

    const state = useDashboardListState<TestFilters>({
      defaultFilters: { apiId: 0, keyword: '', types: [] },
      defaultPageSize: 50,
      routeQuery: query,
      filterCodecs: {
        apiId: createNumberQueryCodec(0),
        keyword: createStringQueryCodec(''),
        types: createStringArrayQueryCodec([])
      }
    })

    expect(state.page.value).toBe(3)
    expect(state.pageSize.value).toBe(20)
    expect(state.filters.apiId).toBe(9)
    expect(state.filters.keyword).toBe('request-1')
    expect(state.filters.types).toEqual(['consume', 'error'])
  })

  it('resets filters, resets to page one, and writes compact query values', async () => {
    const replaceQuery = vi.fn()
    const state = useDashboardListState<TestFilters>({
      defaultFilters: { apiId: 0, keyword: '', types: [] },
      defaultPageSize: 50,
      replaceQuery,
      filterCodecs: {
        apiId: createNumberQueryCodec(0),
        keyword: createStringQueryCodec(''),
        types: createStringArrayQueryCodec([])
      }
    })

    state.filters.apiId = 12
    state.filters.keyword = 'abc'
    state.filters.types = ['consume']
    state.page.value = 4
    await state.applyFilters()

    expect(state.page.value).toBe(1)
    expect(replaceQuery).toHaveBeenLastCalledWith({
      apiId: 12,
      keyword: 'abc',
      types: 'consume'
    })

    await state.resetFilters()
    await nextTick()

    expect(state.filters).toMatchObject({ apiId: 0, keyword: '', types: [] })
    expect(state.page.value).toBe(1)
    expect(replaceQuery).toHaveBeenLastCalledWith({})
  })
})
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm vitest run --project unit tests/app/composables/dashboard/useDashboardListState.test.ts`

Expected: FAIL with module not found for `useDashboardListState`.

- [ ] **Step 3: Implement the composable**

Create `app/composables/dashboard/useDashboardListState.ts`:

```ts
import { computed, reactive, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

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

function isSameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const raw = firstQueryValue(value)
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function createNumberQueryCodec(defaultValue = 0): DashboardQueryCodec<number> {
  return {
    parse: value => {
      const parsed = Number(firstQueryValue(value))
      return Number.isFinite(parsed) ? parsed : defaultValue
    },
    serialize: value => value === defaultValue ? undefined : value
  }
}

export function createStringQueryCodec(defaultValue = ''): DashboardQueryCodec<string> {
  return {
    parse: value => String(firstQueryValue(value) ?? defaultValue),
    serialize: value => value === defaultValue || value.trim() === '' ? undefined : value
  }
}

export function createStringArrayQueryCodec(defaultValue: string[] = []): DashboardQueryCodec<string[]> {
  return {
    parse: value => {
      if (Array.isArray(value)) return value.map(String).filter(Boolean)
      return String(value ?? '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    },
    serialize: value => value.length === defaultValue.length && value.every((item, index) => item === defaultValue[index])
      ? undefined
      : value.join(',')
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
    filterCodecs = {}
  } = options

  const initialQuery = routeQuery ? toValue(routeQuery) : {}
  const filters = reactive(cloneFilters(defaultFilters)) as TFilters
  const page = ref(parsePositiveInteger(initialQuery[pageQueryKey], defaultPage))
  const pageSize = ref(parsePositiveInteger(initialQuery[pageSizeQueryKey], defaultPageSize))

  for (const key of Object.keys(defaultFilters) as Array<keyof TFilters>) {
    const codec = filterCodecs[key]
    if (codec && Object.prototype.hasOwnProperty.call(initialQuery, String(key))) {
      filters[key] = codec.parse(initialQuery[String(key)]) as TFilters[keyof TFilters]
    }
  }

  const activeQuery = computed<Record<string, string | number>>(() => {
    const query: Record<string, string | number> = {}

    if (page.value !== defaultPage) query[pageQueryKey] = page.value
    if (pageSize.value !== defaultPageSize) query[pageSizeQueryKey] = pageSize.value

    for (const key of Object.keys(defaultFilters) as Array<keyof TFilters>) {
      const codec = filterCodecs[key]
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

  watch(pageSize, () => {
    page.value = defaultPage
    void syncQuery()
  })

  watch(page, () => {
    void syncQuery()
  })

  watch(
    () => activeQuery.value,
    (next, previous) => {
      if (!isSameValue(next, previous)) void syncQuery()
    },
    { deep: true }
  )

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
```

- [ ] **Step 4: Verify GREEN**

Run: `pnpm vitest run --project unit tests/app/composables/dashboard/useDashboardListState.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/composables/dashboard/useDashboardListState.ts tests/app/composables/dashboard/useDashboardListState.test.ts
git commit -m "feat: add dashboard list state"
```

---

### Task 3: Enhance Private Paged List Behavior

**Files:**
- Create: `tests/app/composables/dashboard/usePrivatePagedList.test.ts`
- Modify: `app/composables/dashboard/usePrivatePagedList.ts`

**Interfaces:**
- Consumes: existing `UsePrivatePagedListOptions<TFilters, TItem>`.
- Produces:
  - Optional `filters?: TFilters`
  - Optional `page?: Ref<number>`
  - Optional `pageSize?: Ref<number>`
  - Return property `error: Ref<unknown>`
  - Page-size watcher that resets to page `1` and refreshes once.

- [ ] **Step 1: Write failing tests**

Create `tests/app/composables/dashboard/usePrivatePagedList.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { usePrivatePagedList } from '../../../../app/composables/dashboard/usePrivatePagedList'

interface TestFilters extends Record<string, unknown> {
  keyword: string
}

interface TestRow {
  id: number
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('usePrivatePagedList', () => {
  it('refreshes with a page reset when page size changes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ items: [{ id: 1 }], total: 1 })
    vi.stubGlobal('$fetch', fetchMock)

    const page = ref(3)
    const pageSize = ref(50)
    const list = usePrivatePagedList<TestFilters, TestRow>({
      path: '/api/example',
      defaultFilters: { keyword: '' },
      immediate: false,
      page,
      pageSize
    })

    pageSize.value = 20
    await nextTick()
    await nextTick()

    expect(page.value).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/example', {
      query: { keyword: '', limit: 20, offset: 0 }
    })
    expect(list.items.value).toEqual([{ id: 1 }])
  })

  it('keeps only the latest response and exposes the latest error', async () => {
    const first = deferred<{ items: TestRow[], total: number }>()
    const second = deferred<{ items: TestRow[], total: number }>()
    const fetchMock = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    vi.stubGlobal('$fetch', fetchMock)

    const list = usePrivatePagedList<TestFilters, TestRow>({
      path: '/api/example',
      defaultFilters: { keyword: '' },
      immediate: false
    })

    const firstRefresh = list.refresh()
    const secondRefresh = list.refresh()

    second.resolve({ items: [{ id: 2 }], total: 1 })
    await secondRefresh
    first.resolve({ items: [{ id: 1 }], total: 1 })
    await firstRefresh

    expect(list.items.value).toEqual([{ id: 2 }])
    expect(list.total.value).toBe(1)
    expect(list.error.value).toBeNull()

    fetchMock.mockRejectedValueOnce(new Error('network down'))
    await list.refresh()

    expect(list.status.value).toBe('error')
    expect(list.error.value).toBeInstanceOf(Error)
  })
})
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm vitest run --project unit tests/app/composables/dashboard/usePrivatePagedList.test.ts`

Expected: FAIL because `page`, `pageSize`, and `error` are unsupported or because the composable lacks explicit Vue imports for direct unit testing.

- [ ] **Step 3: Modify `usePrivatePagedList`**

Update `app/composables/dashboard/usePrivatePagedList.ts` to import Vue APIs explicitly and add external state support:

```ts
import type { AsyncDataRequestStatus } from '#app'
import { computed, onMounted, reactive, ref, watch, type ComputedRef, type Ref } from 'vue'

export interface PrivatePagedPagination {
  page: number
  limit: number
  offset: number
}

export interface UsePrivatePagedListOptions<
  TFilters extends Record<string, unknown>,
  TItem
> {
  path: string
  defaultFilters: TFilters
  defaultPageSize?: number
  immediate?: boolean
  filters?: TFilters
  page?: Ref<number>
  pageSize?: Ref<number>
  buildQuery?: (filters: TFilters, pagination: PrivatePagedPagination) => Record<string, unknown>
  transform?: (resp: unknown) => { items: TItem[], total: number }
}

export interface UsePrivatePagedListReturn<TFilters, TItem> {
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
```

Inside the function:

```ts
const filters = options.filters ?? (reactive({ ...defaultFilters }) as TFilters)
const page = options.page ?? ref(1)
const pageSize = options.pageSize ?? ref(defaultPageSize)
const error = ref<unknown>(null)
```

In `refresh()`:

```ts
error.value = null
try {
  const resp = await $fetch(path, { query })
  if (seq !== requestSeq) return
  const result = doTransform(resp)
  items.value = result.items
  total.value = result.total
  status.value = 'success'
} catch (err) {
  if (seq !== requestSeq) return
  console.error(`[usePrivatePagedList] fetch ${path} failed`, err)
  items.value = []
  total.value = 0
  error.value = err
  status.value = 'error'
}
```

Add page-size watcher:

```ts
watch(page, () => { void refresh() })
watch(pageSize, () => {
  if (page.value !== 1) {
    page.value = 1
    return
  }
  void refresh()
})
```

Return `error`.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm vitest run --project unit tests/app/composables/dashboard/usePrivatePagedList.test.ts`

Expected: PASS.

- [ ] **Step 5: Run existing relevant tests**

Run: `pnpm vitest run --project unit tests/app/composables/dashboard/useDashboardListState.test.ts tests/app/composables/dashboard/usePrivatePagedList.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/composables/dashboard/usePrivatePagedList.ts tests/app/composables/dashboard/usePrivatePagedList.test.ts
git commit -m "feat: improve private paged lists"
```

---

### Task 4: Migrate Admin Call Logs

**Files:**
- Create: `app/components/admin/AdminCallLogDetailModal.vue`
- Create: `app/composables/admin/useAdminCallLogsPage.ts`
- Modify: `app/pages/admin/logs.vue`

**Interfaces:**
- Consumes:
  - `useDashboardListState`
  - `usePrivatePagedList`
  - `AdminLogRow`, `AdminLogType`, `AdminLogsFilterOptions`
- Produces:
  - `useAdminCallLogsPage(): AdminCallLogsPageState`
  - `AdminCallLogDetailModal` with props `{ row: AdminLogRow | null }` and overlay close event.

- [ ] **Step 1: Write the failing composable smoke test**

Create `tests/app/composables/admin/useAdminCallLogsPage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { useAdminCallLogsPage, ADMIN_CALL_LOG_DEFAULT_FILTERS } from '../../../../app/composables/admin/useAdminCallLogsPage'

describe('useAdminCallLogsPage', () => {
  it('exports stable default filters and active filter counting', () => {
    const page = useAdminCallLogsPage({ immediate: false })

    expect(ADMIN_CALL_LOG_DEFAULT_FILTERS).toMatchObject({
      startAt: '',
      endAt: '',
      apiId: 0,
      categoryId: 0,
      types: [],
      apiKeyId: '',
      userId: '',
      requestId: ''
    })
    expect(page.activeFilterCount.value).toBe(0)

    page.filters.apiId = 12
    page.filters.requestId = 'req-1'

    expect(page.activeFilterCount.value).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify RED**

Run: `pnpm vitest run --project unit tests/app/composables/admin/useAdminCallLogsPage.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Create `useAdminCallLogsPage`**

Create `app/composables/admin/useAdminCallLogsPage.ts` with these exported interfaces and constants:

```ts
import type { TableColumn } from '@nuxt/ui'
import { computed, ref } from 'vue'
import {
  ADMIN_LOG_TYPES,
  type AdminLogRow,
  type AdminLogType,
  type AdminLogsFilterOptions
} from '~~/shared/types/admin-logs'
import {
  createNumberQueryCodec,
  createStringArrayQueryCodec,
  createStringQueryCodec,
  useDashboardListState
} from '~/composables/dashboard/useDashboardListState'
import { usePrivatePagedList } from '~/composables/dashboard/usePrivatePagedList'

export interface AdminCallLogsFilters extends Record<string, unknown> {
  startAt: string
  endAt: string
  apiId: number
  categoryId: number
  types: AdminLogType[]
  apiKeyId: number | ''
  userId: number | ''
  requestId: string
}

export interface UseAdminCallLogsPageOptions {
  immediate?: boolean
  replaceQuery?: (query: Record<string, string | number>) => void | Promise<void>
  routeQuery?: Record<string, unknown> | Ref<Record<string, unknown>>
}

export const ADMIN_CALL_LOG_DEFAULT_FILTERS: AdminCallLogsFilters = {
  startAt: '',
  endAt: '',
  apiId: 0,
  categoryId: 0,
  types: [],
  apiKeyId: '',
  userId: '',
  requestId: ''
}

export const ADMIN_CALL_LOG_TYPE_META: Record<AdminLogType, { label: string, color: 'success' | 'error' | 'primary', icon: string }> = {
  consume: { label: '请求', color: 'primary', icon: 'i-mdi-swap-horizontal-circle-outline' },
  error: { label: '错误', color: 'error', icon: 'i-mdi-alert-circle-outline' }
}

export function useAdminCallLogsPage(options: UseAdminCallLogsPageOptions = {}) {
  const filterOptions = ref<AdminLogsFilterOptions>({ apis: [], categories: [] })
  const listState = useDashboardListState<AdminCallLogsFilters>({
    defaultFilters: ADMIN_CALL_LOG_DEFAULT_FILTERS,
    defaultPageSize: 50,
    routeQuery: options.routeQuery,
    replaceQuery: options.replaceQuery,
    filterCodecs: {
      startAt: createStringQueryCodec(''),
      endAt: createStringQueryCodec(''),
      apiId: createNumberQueryCodec(0),
      categoryId: createNumberQueryCodec(0),
      types: createStringArrayQueryCodec([]) as never,
      apiKeyId: createNumberQueryCodec(0) as never,
      userId: createNumberQueryCodec(0) as never,
      requestId: createStringQueryCodec('')
    }
  })

  const list = usePrivatePagedList<AdminCallLogsFilters, AdminLogRow>({
    path: '/api/admin/logs/list',
    defaultFilters: ADMIN_CALL_LOG_DEFAULT_FILTERS,
    filters: listState.filters,
    page: listState.page,
    pageSize: listState.pageSize,
    immediate: options.immediate ?? true,
    buildQuery: (filters, pagination) => ({
      startAt: filters.startAt ? new Date(filters.startAt).toISOString() : undefined,
      endAt: filters.endAt ? new Date(filters.endAt).toISOString() : undefined,
      apiId: filters.apiId || undefined,
      categoryId: filters.categoryId || undefined,
      types: filters.types.length ? filters.types.join(',') : undefined,
      apiKeyId: filters.apiKeyId || undefined,
      userId: filters.userId || undefined,
      requestId: filters.requestId?.trim() || undefined,
      limit: pagination.limit,
      offset: pagination.offset
    })
  })

  const typeSelectItems = ADMIN_LOG_TYPES.map(type => ({
    label: ADMIN_CALL_LOG_TYPE_META[type].label,
    value: type,
    icon: ADMIN_CALL_LOG_TYPE_META[type].icon
  }))
  const apiSelectItems = computed(() => [
    { label: '全部接口', value: 0 },
    ...filterOptions.value.apis.map(api => ({ label: `${api.name}（${api.apiPath}）`, value: api.id }))
  ])
  const categorySelectItems = computed(() => [
    { label: '全部分类', value: 0 },
    ...filterOptions.value.categories.map(category => ({ label: category.name, value: category.id }))
  ])
  const hasAdvancedFilters = computed(
    () => listState.filters.apiKeyId !== '' || listState.filters.userId !== '' || !!listState.filters.requestId
  )
  const activeFilterCount = computed(() => [
    !!listState.filters.startAt,
    !!listState.filters.endAt,
    listState.filters.apiId !== 0,
    listState.filters.categoryId !== 0,
    listState.filters.types.length > 0,
    listState.filters.apiKeyId !== '',
    listState.filters.userId !== '',
    !!listState.filters.requestId
  ].filter(Boolean).length)
  const columns: TableColumn<AdminLogRow>[] = [
    { accessorKey: 'createdAt', header: '时间' },
    { accessorKey: 'userName', header: '用户' },
    { accessorKey: 'apiKeyName', header: '密钥' },
    { accessorKey: 'apiName', header: '接口' },
    { accessorKey: 'cost', header: '费用' },
    { id: 'summary', header: '摘要' },
    { id: 'actions', header: '' }
  ]

  async function loadFilterOptions() {
    filterOptions.value = await $fetch<AdminLogsFilterOptions>('/api/admin/logs/filters') || { apis: [], categories: [] }
  }

  return {
    ...listState,
    ...list,
    filterOptions,
    typeSelectItems,
    apiSelectItems,
    categorySelectItems,
    hasAdvancedFilters,
    activeFilterCount,
    columns,
    loadFilterOptions
  }
}
```

- [ ] **Step 4: Verify composable test**

Run: `pnpm vitest run --project unit tests/app/composables/admin/useAdminCallLogsPage.test.ts`

Expected: PASS.

- [ ] **Step 5: Extract detail modal**

Create `app/components/admin/AdminCallLogDetailModal.vue` using the existing detail body from `app/pages/admin/logs.vue`. Keep the same user-visible labels and cards. The script must be:

```vue
<script setup lang="ts">
import type { AdminLogRow } from '~~/shared/types/admin-logs'
import { ADMIN_CALL_LOG_TYPE_META } from '~/composables/admin/useAdminCallLogsPage'

const props = defineProps<{
  row: AdminLogRow | null
}>()

function formatDate(iso: string) {
  return formatDateTime(iso)
}

function formatBytes(value: number | null) {
  if (value == null) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}
</script>
```

The template root must be:

```vue
<template>
  <UModal
    title="调用详情"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <div
        v-if="props.row"
        class="space-y-4 text-sm"
      >
        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-muted">时间</div>
            <div>{{ formatDate(props.row.createdAt) }}</div>
          </div>
          <div>
            <div class="text-xs text-muted">类型</div>
            <UBadge
              :color="ADMIN_CALL_LOG_TYPE_META[props.row.type].color"
              :icon="ADMIN_CALL_LOG_TYPE_META[props.row.type].icon"
              variant="subtle"
              size="sm"
              class="w-fit"
            >
              {{ ADMIN_CALL_LOG_TYPE_META[props.row.type].label }}
            </UBadge>
          </div>
          <div>
            <div class="text-xs text-muted">请求 ID</div>
            <div class="font-mono text-xs break-all">{{ props.row.requestId || '-' }}</div>
          </div>
          <div>
            <div class="text-xs text-muted">用户</div>
            <div>{{ props.row.userId ? `${props.row.userName || '-'} (#${props.row.userId})` : '匿名' }}</div>
          </div>
        </div>

        <UCard :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }">
          <template #header>
            <span class="text-xs font-semibold text-muted">请求</span>
          </template>
          <div class="space-y-2 text-xs">
            <div class="flex items-center gap-2">
              <UBadge color="neutral" variant="subtle" class="font-mono">
                {{ props.row.method }}
              </UBadge>
              <span class="font-mono break-all">{{ props.row.apiPath }}</span>
            </div>
            <div
              v-if="props.row.queryString"
              class="font-mono text-muted break-all"
            >
              ?{{ props.row.queryString }}
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-muted">
              <span>状态码 <span class="tabular-nums">{{ props.row.statusCode }}</span></span>
              <span>耗时 <span class="tabular-nums text-default">{{ props.row.latencyMs }}ms</span></span>
              <span>费用 <span class="tabular-nums text-default">{{ props.row.cost > 0 ? `-${props.row.cost}` : '免费' }}</span></span>
              <span>请求体 <span class="text-default">{{ formatBytes(props.row.requestSize) }}</span></span>
              <span>响应体 <span class="text-default">{{ formatBytes(props.row.responseSize) }}</span></span>
            </div>
          </div>
        </UCard>

        <UCard
          v-if="props.row.errorCode || props.row.errorMessage"
          :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }"
        >
          <template #header>
            <span class="text-xs font-semibold text-error">错误</span>
          </template>
          <div class="space-y-1 text-xs">
            <div v-if="props.row.errorCode">
              <span class="text-muted">code </span>
              <span class="font-mono">{{ props.row.errorCode }}</span>
            </div>
            <div
              v-if="props.row.errorMessage"
              class="break-all"
            >
              {{ props.row.errorMessage }}
            </div>
          </div>
        </UCard>

        <UCard :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }">
          <template #header>
            <span class="text-xs font-semibold text-muted">客户端</span>
          </template>
          <div class="space-y-1 text-xs">
            <div>
              <span class="text-muted">IP </span>
              <span class="font-mono">{{ props.row.ip || '-' }}</span>
            </div>
            <div>
              <span class="text-muted">User-Agent </span>
              <span class="font-mono break-all">{{ props.row.userAgent || '-' }}</span>
            </div>
            <div v-if="props.row.referer">
              <span class="text-muted">Referer </span>
              <span class="font-mono break-all">{{ props.row.referer }}</span>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UModal>
</template>
```

- [ ] **Step 6: Rewrite `app/pages/admin/logs.vue` as an orchestration shell**

Use `useRoute()` and `useRouter()` to wire URL state:

```ts
const route = useRoute()
const router = useRouter()
const overlay = useOverlay()
const detailModal = overlay.create(LazyAdminAdminCallLogDetailModal, { destroyOnClose: true })

const page = useAdminCallLogsPage({
  routeQuery: computed(() => route.query),
  replaceQuery: query => router.replace({ query })
})

function openDetail(row: AdminLogRow) {
  detailModal.open({ row })
}

onMounted(() => {
  void page.loadFilterOptions()
})
```

Template requirements:

- Keep the existing `UDashboardPanel id="admin-logs"`.
- Use `page.applyFilters` for query, `page.resetFilters` for reset, and `page.refresh` for refresh.
- Replace local `columns`, `items`, `total`, `loading`, and filter option refs with `page.columns`, `page.items`, `page.total`, `page.loading`, and computed options from the composable.
- Remove the inline `UModal`.

- [ ] **Step 7: Verify migration**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm vitest run --project unit tests/app/composables/admin/useAdminCallLogsPage.test.ts
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add app/components/admin/AdminCallLogDetailModal.vue app/composables/admin/useAdminCallLogsPage.ts app/pages/admin/logs.vue tests/app/composables/admin/useAdminCallLogsPage.test.ts
git commit -m "refactor: streamline admin call logs"
```

---

### Task 5: Migrate User Call Logs

**Files:**
- Create: `app/components/user/UserCallLogDetailModal.vue`
- Create: `app/composables/user/useUserCallLogsPage.ts`
- Modify: `app/pages/user/logs.vue`
- Test: `tests/app/composables/user/useUserCallLogsPage.test.ts`

**Interfaces:**
- Produces:
  - `UserCallLogRow`
  - `UserCallLogFilters`
  - `USER_CALL_LOG_DEFAULT_FILTERS`
  - `useUserCallLogsPage(options?: UseUserCallLogsPageOptions)`

- [ ] **Step 1: Write failing test**

Create `tests/app/composables/user/useUserCallLogsPage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { USER_CALL_LOG_DEFAULT_FILTERS, useUserCallLogsPage } from '../../../../app/composables/user/useUserCallLogsPage'

describe('useUserCallLogsPage', () => {
  it('counts only active user log filters', () => {
    const page = useUserCallLogsPage({ immediate: false })

    expect(USER_CALL_LOG_DEFAULT_FILTERS).toEqual({
      apiId: 0,
      apiKeyId: 0,
      status: 'all'
    })
    expect(page.activeFilterCount.value).toBe(0)

    page.filters.apiId = 5
    page.filters.status = 'failure'

    expect(page.activeFilterCount.value).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify RED**

Run: `pnpm vitest run --project unit tests/app/composables/user/useUserCallLogsPage.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Create composable**

Create `app/composables/user/useUserCallLogsPage.ts`:

```ts
import type { TableColumn } from '@nuxt/ui'
import { computed, ref } from 'vue'
import {
  createNumberQueryCodec,
  createStringQueryCodec,
  useDashboardListState
} from '~/composables/dashboard/useDashboardListState'
import { usePrivatePagedList } from '~/composables/dashboard/usePrivatePagedList'

export interface UserCallLogRow {
  id: number
  apiId: number
  apiName: string | null
  apiPath: string
  method: string
  statusCode: number
  latencyMs: number
  ip: string | null
  apiKeyId: number | null
  apiKeyName: string | null
  errorCode: string | null
  errorMessage: string | null
  creditsCost: number
  isCounted: boolean
  createdAt: string
}

export interface UserCallLogFilterOptions {
  apis: Array<{ id: number, name: string, apiPath: string }>
  apiKeys: Array<{ id: number, name: string }>
}

export interface UserCallLogFilters extends Record<string, unknown> {
  apiId: number
  apiKeyId: number
  status: 'all' | 'success' | 'failure'
}

export interface UseUserCallLogsPageOptions {
  immediate?: boolean
  replaceQuery?: (query: Record<string, string | number>) => void | Promise<void>
  routeQuery?: Record<string, unknown> | Ref<Record<string, unknown>>
}

export const USER_CALL_LOG_DEFAULT_FILTERS: UserCallLogFilters = {
  apiId: 0,
  apiKeyId: 0,
  status: 'all'
}

export function isUserCallSuccess(row: UserCallLogRow) {
  return row.isCounted && row.statusCode >= 200 && row.statusCode < 400 && !row.errorCode
}

export function userCallOutcomeLabel(row: UserCallLogRow) {
  if (!row.isCounted) return '未计数'
  return isUserCallSuccess(row) ? '成功' : '失败'
}

export function userCallOutcomeColor(row: UserCallLogRow): 'success' | 'error' | 'neutral' {
  if (!row.isCounted) return 'neutral'
  return isUserCallSuccess(row) ? 'success' : 'error'
}

export function userCallOutcomeIcon(row: UserCallLogRow) {
  if (!row.isCounted) return 'i-mdi-minus-circle-outline'
  return isUserCallSuccess(row) ? 'i-mdi-check-circle-outline' : 'i-mdi-alert-circle-outline'
}

export function useUserCallLogsPage(options: UseUserCallLogsPageOptions = {}) {
  const filterOptions = ref<UserCallLogFilterOptions>({ apis: [], apiKeys: [] })
  const listState = useDashboardListState<UserCallLogFilters>({
    defaultFilters: USER_CALL_LOG_DEFAULT_FILTERS,
    defaultPageSize: 50,
    routeQuery: options.routeQuery,
    replaceQuery: options.replaceQuery,
    filterCodecs: {
      apiId: createNumberQueryCodec(0),
      apiKeyId: createNumberQueryCodec(0),
      status: createStringQueryCodec('all') as never
    }
  })
  const list = usePrivatePagedList<UserCallLogFilters, UserCallLogRow>({
    path: '/api/user/calls/list',
    defaultFilters: USER_CALL_LOG_DEFAULT_FILTERS,
    filters: listState.filters,
    page: listState.page,
    pageSize: listState.pageSize,
    immediate: options.immediate ?? true,
    buildQuery: (filters, pagination) => ({
      apiId: filters.apiId || undefined,
      apiKeyId: filters.apiKeyId || undefined,
      status: filters.status === 'all' ? undefined : filters.status,
      limit: pagination.limit,
      offset: pagination.offset
    })
  })
  const apiSelectItems = computed(() => [
    { label: '全部 API', value: 0 },
    ...filterOptions.value.apis.map(api => ({ label: `${api.name}（${api.apiPath}）`, value: api.id }))
  ])
  const keySelectItems = computed(() => [
    { label: '全部 Key', value: 0 },
    ...filterOptions.value.apiKeys.map(key => ({ label: key.name || `#${key.id}`, value: key.id }))
  ])
  const statusSelectItems = [
    { label: '全部状态', value: 'all' },
    { label: '成功', value: 'success' },
    { label: '失败', value: 'failure' }
  ]
  const activeFilterCount = computed(() => [
    listState.filters.apiId !== 0,
    listState.filters.apiKeyId !== 0,
    listState.filters.status !== 'all'
  ].filter(Boolean).length)
  const columns: TableColumn<UserCallLogRow>[] = [
    { accessorKey: 'createdAt', header: '时间' },
    { accessorKey: 'apiKeyName', header: '密钥' },
    { accessorKey: 'apiName', header: '接口' },
    { accessorKey: 'creditsCost', header: '费用' },
    { id: 'summary', header: '摘要' },
    { id: 'actions', header: '' }
  ]

  async function loadFilterOptions() {
    filterOptions.value = await $fetch<UserCallLogFilterOptions>('/api/user/calls/filters') || { apis: [], apiKeys: [] }
  }

  return {
    ...listState,
    ...list,
    filterOptions,
    apiSelectItems,
    keySelectItems,
    statusSelectItems,
    activeFilterCount,
    columns,
    loadFilterOptions
  }
}
```

- [ ] **Step 4: Verify composable test**

Run: `pnpm vitest run --project unit tests/app/composables/user/useUserCallLogsPage.test.ts`

Expected: PASS.

- [ ] **Step 5: Extract detail modal and update page**

Create `app/components/user/UserCallLogDetailModal.vue` using the detail body from `app/pages/user/logs.vue`. Import outcome helpers from `useUserCallLogsPage`.

Update `app/pages/user/logs.vue` to:

- Remove local `LogRow`, `FilterOptions`, fetch state, watchers, detail modal, and columns.
- Call `useUserCallLogsPage({ routeQuery: computed(() => route.query), replaceQuery: query => router.replace({ query }) })`.
- Open details with `overlay.create(LazyUserUserCallLogDetailModal, { destroyOnClose: true })`.
- Keep existing table cell slot rendering by switching helper references to imported user outcome helpers and `page.columns`.

- [ ] **Step 6: Verify migration**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm vitest run --project unit tests/app/composables/user/useUserCallLogsPage.test.ts
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add app/components/user/UserCallLogDetailModal.vue app/composables/user/useUserCallLogsPage.ts app/pages/user/logs.vue tests/app/composables/user/useUserCallLogsPage.test.ts
git commit -m "refactor: streamline user call logs"
```

---

### Task 6: Trim Admin Users Page Around Shared List State

**Files:**
- Modify: `app/pages/admin/users/index.vue`
- Modify: `app/composables/admin/useAdminUsersPage.ts`
- Test: `tests/app/composables/admin/useAdminUsersPage.test.ts`

**Interfaces:**
- Consumes: `useClientPagination`, `useDashboardListState`, existing user CRUD functions.
- Produces: page-local keyword and pagination state become URL-aware where useful, with row selection cleared after page-size change.

- [ ] **Step 1: Write failing test for selection and filter state**

Create `tests/app/composables/admin/useAdminUsersPage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { useAdminUsersPage } from '../../../../app/composables/admin/useAdminUsersPage'

describe('useAdminUsersPage', () => {
  it('clears selection through the public clearSelection API', () => {
    const page = useAdminUsersPage()

    page.rowSelection.value = { '1': true, '2': true }
    expect(page.selectedIds.value).toEqual([1, 2])

    page.clearSelection()
    expect(page.selectedIds.value).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify RED or current compatibility**

Run: `pnpm vitest run --project unit tests/app/composables/admin/useAdminUsersPage.test.ts`

Expected before import hardening: FAIL if Nuxt auto imports or `useToast` are unavailable in the unit environment.

- [ ] **Step 3: Harden composable imports for unit tests**

Modify `app/composables/admin/useAdminUsersPage.ts`:

```ts
import { computed, ref } from 'vue'
import { parseFetchError } from '#shared/utils/clientError'
```

Keep the existing public return shape unchanged.

- [ ] **Step 4: Update page state**

In `app/pages/admin/users/index.vue`:

- Use `useDashboardListState` for `keyword`, `page`, and `pageSize` only if it reduces code without changing the endpoint contract.
- Keep `useClientPagination(items, 10)` for in-memory slicing unless the backend API is changed in a separate server task.
- Clear row selection when `pageSize` or `keyword` changes:

```ts
watch([keyword, pageSize], () => {
  page.value = 1
  clearSelection()
})
```

- Keep existing modals because they are already business components and coupled to selected rows.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm vitest run --project unit tests/app/composables/admin/useAdminUsersPage.test.ts
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add app/composables/admin/useAdminUsersPage.ts app/pages/admin/users/index.vue tests/app/composables/admin/useAdminUsersPage.test.ts
git commit -m "refactor: tidy admin users list state"
```

---

### Task 7: Extract API Key Reset Flow

**Files:**
- Create: `app/components/api-key/ApiKeyResetModal.vue`
- Modify: `app/pages/user/apikeys.vue`

**Interfaces:**
- Consumes:
  - `ApiKeyItem`
  - `resetKey(id: number): Promise<ApiKeyItem | undefined>`
- Produces:
  - `ApiKeyResetModal` props `{ target: ApiKeyItem | null, onReset: (id: number) => Promise<ApiKeyItem | undefined> }`
  - Emits `saved` after a successful reset.

- [ ] **Step 1: Write failing component import test**

Create `tests/app/components/api-key/ApiKeyResetModal.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import ApiKeyResetModal from '../../../../app/components/api-key/ApiKeyResetModal.vue'

describe('ApiKeyResetModal', () => {
  it('is importable as a Vue component', () => {
    expect(ApiKeyResetModal).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify RED**

Run: `pnpm vitest run --project unit tests/app/components/api-key/ApiKeyResetModal.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Create reset modal**

Create `app/components/api-key/ApiKeyResetModal.vue`:

```vue
<script setup lang="ts">
import { parseFetchError } from '#shared/utils/clientError'
import type { ApiKeyItem } from '~/composables/api/types'

const props = defineProps<{
  target: ApiKeyItem | null
  onReset: (id: number) => Promise<ApiKeyItem | undefined>
}>()

const emit = defineEmits<{
  saved: []
}>()

const toast = useToast()
const loading = ref(false)
const result = ref<ApiKeyItem | null>(null)

async function confirmReset() {
  if (!props.target) return
  loading.value = true
  try {
    const next = await props.onReset(props.target.id)
    result.value = next || null
    emit('saved')
    toast.add({ title: '已重置，旧 Key 立即失效', color: 'success' })
  } catch (err) {
    toast.add({ title: parseFetchError(err, '重置失败'), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: '已复制到剪贴板', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}
</script>

<template>
  <UModal
    :title="result ? '已重置，请保存新 Key' : '确认重置 API Key'"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <UAlert
        v-if="!result"
        color="warning"
        variant="subtle"
        title="重置将立即让旧 Key 失效"
        :description="`将重置「${props.target?.name || '默认密钥'}」，所有正在使用旧 Key 的调用方会立刻失败，请确认后再继续。`"
        icon="i-mdi-alert-outline"
      />
      <code
        v-else
        class="block font-mono text-sm break-all p-3 rounded bg-elevated"
      >
        {{ result.apiKey }}
      </code>
    </template>

    <template #footer="{ close }">
      <div
        v-if="!result"
        class="flex justify-end gap-2 w-full"
      >
        <UButton
          variant="outline"
          color="neutral"
          @click="close"
        >
          取消
        </UButton>
        <UButton
          color="warning"
          :loading="loading"
          @click="confirmReset"
        >
          确认重置
        </UButton>
      </div>
      <div
        v-else
        class="flex justify-end gap-2 w-full"
      >
        <UButton
          variant="outline"
          color="neutral"
          icon="i-mdi-content-copy"
          @click="copy(result.apiKey)"
        >
          复制
        </UButton>
        <UButton @click="close">
          我已保存
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

- [ ] **Step 4: Update user API keys page**

In `app/pages/user/apikeys.vue`:

- Remove `resetOpen`, `resetLoading`, `resetResult`, and `confirmReset`.
- Add:

```ts
const overlay = useOverlay()
const resetModal = overlay.create(LazyApiKeyApiKeyResetModal, { destroyOnClose: true })

function openReset(row: ApiKeyItem) {
  resetModal.open({
    target: row,
    onReset: resetKey
  })
}
```

- Remove the inline reset `UModal` from the template.
- Keep create/edit modals unchanged in this task.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm vitest run --project unit tests/app/components/api-key/ApiKeyResetModal.test.ts
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/api-key/ApiKeyResetModal.vue app/pages/user/apikeys.vue tests/app/components/api-key/ApiKeyResetModal.test.ts
git commit -m "refactor: extract api key reset modal"
```

---

### Task 8: Final Verification And Documentation

**Files:**
- Modify: `docs/frontend/dashboard.md`

**Interfaces:**
- Consumes: new `useDashboardListState`, enhanced `usePrivatePagedList`, and migrated pages.
- Produces: dashboard docs mention URL-synced list state and private paged list conventions.

- [ ] **Step 1: Update dashboard docs**

Add this section to `docs/frontend/dashboard.md` under pagination and filtering:

```md
### 6.1 列表状态与 URL 同步

长列表页优先使用 `useDashboardListState` 管理 `filters` / `page` / `pageSize`。私有数据列表继续使用 `usePrivatePagedList` 拉取，确保响应不进入 Nuxt SSR payload。

适合写入 URL 的状态：

- 调用日志等排查型页面的筛选条件
- 当前页与每页条数
- 简短、稳定、可分享的查询值

不适合写入 URL 的状态：

- 弹窗开关
- 行选择
- 临时输入但尚未点击“查询”的内容
- API Key 明文或其它敏感内容
```

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test:run
```

Expected: all PASS.

- [ ] **Step 3: Inspect final diff**

Run: `git diff --stat HEAD`

Expected: only files listed in this plan are modified.

- [ ] **Step 4: Commit**

```bash
git add docs/frontend/dashboard.md
git commit -m "docs: document dashboard list state"
```

---

## Self-Review Checklist

- Spec coverage: tasks cover test stabilization, list-state composable, private paged list enhancement, admin logs, user logs, admin users, user API key reset extraction, and dashboard docs.
- Placeholder scan: no unresolved markers or unspecified implementation slots are intentionally left.
- Type consistency: `filters`, `page`, `pageSize`, `error`, `applyFilters`, `resetFilters`, and `syncQuery` names are consistent across tasks.
- Privacy check: private list fetching remains `$fetch` based and client-triggered for immediate private data.
- Verification check: every production change has a failing-test step before implementation and a passing-test step after implementation.
