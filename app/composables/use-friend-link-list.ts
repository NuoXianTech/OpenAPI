import type { FriendLinkItem } from '#shared/types/content'

export function useFriendLinkList() {
  const { data, pending, error: rawError, refresh } = useFetch<FriendLinkItem[]>(
    '/api/friend-links/list',
    {
      key: 'public-friend-links',
      default: () => []
    }
  )

  const items = computed(() => data.value || [])
  const error = computed(() => {
    if (!rawError.value) return null
    return rawError.value instanceof Error ? rawError.value.message : String(rawError.value)
  })
  const isEmpty = computed(() => !pending.value && !error.value && items.value.length === 0)

  // 包装为无参函数，避免操作按钮透传的点击事件被误当成 refresh 参数。
  const fetchFriendLinks = async () => {
    await refresh()
  }

  return {
    items,
    loading: pending,
    error,
    isEmpty,
    fetchFriendLinks
  }
}
