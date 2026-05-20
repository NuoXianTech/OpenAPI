import type { FriendLinkItem } from './types'

export function useFriendLinkList() {
  const { data, pending, error: rawError, refresh } = useFetch<FriendLinkItem[]>(
    '/api/friend-links/list',
    {
      key: 'public-friend-links',
      default: () => []
    }
  )

  const items = computed(() => data.value || [])
  const loading = computed(() => pending.value)
  const error = computed(() => {
    if (!rawError.value) return null
    return rawError.value instanceof Error ? rawError.value.message : String(rawError.value)
  })
  const isEmpty = computed(() => !loading.value && !error.value && items.value.length === 0)

  return {
    items,
    loading,
    error,
    isEmpty,
    fetchFriendLinks: refresh
  }
}
