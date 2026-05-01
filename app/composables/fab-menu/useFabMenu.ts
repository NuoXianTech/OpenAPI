import type { FabMenuItem } from './types'

export function useFabMenu() {
  // FAB 菜单仅在客户端使用（依赖弹窗交互），lazy 加载避免阻塞首屏
  const { data, pending, error: rawError, refresh } = useAsyncData(
    'public-fab-menu',
    () => $fetch<{ code: number, msg: string, data: FabMenuItem[] }>('/api/fab-menu/list'),
    {
      default: () => ({ code: 0, msg: '', data: [] as FabMenuItem[] }),
      lazy: true,
      server: false,
    },
  )

  const items = computed(() => data.value?.data || [])
  const loading = computed(() => pending.value)
  const error = computed(() => {
    if (!rawError.value) return null
    return rawError.value instanceof Error ? rawError.value.message : String(rawError.value)
  })

  return {
    items,
    loading,
    error,
    loadFabMenu: refresh,
  }
}
