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

  // 包装为无参函数：吃掉 onClick 透传的事件对象，对齐 useApiList().fetchList 的调用契约
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
