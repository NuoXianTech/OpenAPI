import type { AsyncDataRequestStatus } from '#app'
import {
  computed,
  onMounted,
  ref,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref
} from 'vue'

interface UsePrivateResourceOptions<TData> {
  path: string
  defaultData: () => TData
  immediate?: boolean
  query?: MaybeRefOrGetter<Record<string, unknown> | undefined>
}

interface UsePrivateResourceReturn<TData> {
  data: Ref<TData>
  status: Ref<AsyncDataRequestStatus>
  loading: ComputedRef<boolean>
  error: Ref<unknown>
  refresh: () => Promise<void>
}

export function usePrivateResource<TData>(
  options: UsePrivateResourceOptions<TData>
): UsePrivateResourceReturn<TData> {
  const {
    path,
    defaultData,
    immediate = true,
    query
  } = options

  const data = ref(defaultData()) as Ref<TData>
  const status = ref<AsyncDataRequestStatus>(immediate ? 'pending' : 'idle')
  const error = ref<unknown>(null)
  const loading = computed(() => status.value === 'pending')
  let requestSeq = 0

  async function refresh() {
    const seq = ++requestSeq
    status.value = 'pending'
    error.value = null
    try {
      const result = await $fetch<TData>(path, { query: toValue(query) })
      if (seq !== requestSeq) return
      data.value = result ?? defaultData()
      status.value = 'success'
    } catch (err) {
      if (seq !== requestSeq) return
      data.value = defaultData()
      error.value = err
      status.value = 'error'
    }
  }

  if (immediate) {
    onMounted(() => { void refresh() })
  }

  return {
    data,
    status,
    loading,
    error,
    refresh
  }
}
