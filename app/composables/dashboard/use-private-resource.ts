import type { AsyncDataRequestStatus } from '#app'
import {
  computed,
  getCurrentScope,
  onMounted,
  onScopeDispose,
  ref,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref
} from 'vue'

interface UsePrivateResourceOptions<TData> {
  path: MaybeRefOrGetter<string>
  defaultData: () => TData
  immediate?: boolean
  query?: MaybeRefOrGetter<Record<string, unknown> | undefined>
  timeoutMs?: number
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
    query,
    timeoutMs = 15_000
  } = options

  const data = ref(defaultData()) as Ref<TData>
  const status = ref<AsyncDataRequestStatus>(immediate ? 'pending' : 'idle')
  const error = ref<unknown>(null)
  const loading = computed(() => status.value === 'pending')
  let requestSeq = 0
  let activeController: AbortController | null = null

  async function refresh() {
    const seq = ++requestSeq
    activeController?.abort()
    const controller = new AbortController()
    activeController = controller
    status.value = 'pending'
    error.value = null
    try {
      const result = await $fetch<TData>(toValue(path), {
        query: toValue(query),
        signal: controller.signal,
        timeout: timeoutMs
      })
      if (seq !== requestSeq) return
      data.value = (result ?? defaultData()) as TData
      status.value = 'success'
    } catch (err) {
      if (seq !== requestSeq) return
      error.value = err
      status.value = 'error'
    } finally {
      if (seq === requestSeq && activeController === controller) {
        activeController = null
      }
    }
  }

  if (immediate) {
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
    data,
    status,
    loading,
    error,
    refresh
  }
}
