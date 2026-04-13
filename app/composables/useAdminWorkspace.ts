const ADMIN_TAB_STORAGE_KEY = 'admin:active-tab'

export function useAdminWorkspace(tabs: string[], fallbackTab: string) {
  const normalizeTab = (value: string | null | undefined) => {
    if (!value) {
      return null
    }

    return tabs.includes(value) ? value : null
  }

  const activeTab = useState<string>('admin-workspace-tab', () => normalizeTab(fallbackTab) || tabs[0] || 'users')

  const persistTab = (value: string) => {
    if (!import.meta.client) {
      return
    }
    localStorage.setItem(ADMIN_TAB_STORAGE_KEY, value)
  }

  const restoreTab = () => {
    if (!import.meta.client) {
      return activeTab.value
    }

    const fromStorage = normalizeTab(localStorage.getItem(ADMIN_TAB_STORAGE_KEY))
    if (fromStorage) {
      activeTab.value = fromStorage
      return fromStorage
    }

    const normalizedFallback = normalizeTab(fallbackTab) || tabs[0] || 'users'
    activeTab.value = normalizedFallback
    return normalizedFallback
  }

  const setActiveTab = (value: string) => {
    const normalized = normalizeTab(value)
    if (!normalized) {
      return null
    }

    activeTab.value = normalized
    persistTab(normalized)
    return normalized
  }

  return {
    activeTab,
    normalizeTab,
    restoreTab,
    setActiveTab,
  }
}
