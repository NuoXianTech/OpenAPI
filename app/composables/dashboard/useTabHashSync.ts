export interface TabHashItem {
  value: string
}

export interface UseTabHashSyncOptions<T extends TabHashItem> {
  tabs: ReadonlyArray<T>
  // 启用数字键 1-9 切 tab；input/textarea focus 时 Nuxt UI defineShortcuts 默认会跳过
  shortcuts?: 'numeric' | false
}

// 以 route.hash 为唯一真值，writable computed 直接桥到 UTabs 的 v-model。
// 无效 hash 静默回落 tabs[0]，URL 不改写；set 时复用 router.replace 不污染 history。
export function useTabHashSync<T extends TabHashItem>(
  options: UseTabHashSyncOptions<T>
): WritableComputedRef<T['value']> {
  const route = useRoute()
  const router = useRouter()
  const { tabs, shortcuts = 'numeric' } = options

  const fallback = tabs[0]!.value
  const isValid = (v: string) => tabs.some(t => t.value === v)

  const active = computed<T['value']>({
    get: () => {
      const h = route.hash.replace('#', '')
      return isValid(h) ? h : fallback
    },
    set: (v) => {
      const next = '#' + v
      if (route.hash === next) return
      router.replace({ hash: next })
    }
  })

  if (shortcuts === 'numeric') {
    const map: Record<string, () => void> = {}
    tabs.slice(0, 9).forEach((tab, i) => {
      map[String(i + 1)] = () => {
        active.value = tab.value
      }
    })
    defineShortcuts(map)
  }

  return active
}
