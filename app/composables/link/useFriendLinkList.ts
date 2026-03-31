import type { FriendLinkItem, FriendLinkListResponse } from './types'

export function useFriendLinkList() {
  const items = ref<FriendLinkItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchFriendLinks = async () => {
    loading.value = true
    error.value = null

    try {
      const res = await $fetch<FriendLinkListResponse>('/api/friend-links/list')
      items.value = res.data || []
      return res
    }
    catch (e) {
      error.value = (e && (e as Error).message) ? (e as Error).message : String(e)
      items.value = []
      return null
    }
    finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !loading.value && !error.value && items.value.length === 0)

  return {
    items,
    loading,
    error,
    isEmpty,
    fetchFriendLinks,
  }
}
