import type { FriendLinkListResponse } from './types'

export function useFriendLinkList() {
  const { data, pending, error: rawError, refresh } = useAsyncData<FriendLinkListResponse>(
    'public-friend-links',
    () => $fetch<FriendLinkListResponse>('/api/friend-links/list'),
    {
      default: () => ({ code: 0, msg: '', data: [] }),
    },
  )

  const items = computed(() => data.value?.data || [])
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
    fetchFriendLinks: refresh,
  }
}
