import type { FabMenuItem } from './types'

export function useFabMenu() {
  const items = ref<FabMenuItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadFabMenu = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ code: number, msg: string, data: FabMenuItem[] }>('/api/fab-menu/list')
      items.value = res.data || []
      return res
    }
    catch (e) {
      error.value = (e && (e as any).message) ? (e as any).message : String(e)
      items.value = []
      return null
    }
    finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    loadFabMenu,
  }
}
