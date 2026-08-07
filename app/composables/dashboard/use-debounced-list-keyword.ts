import { watchDebounced } from '@vueuse/core'
import { toValue, type MaybeRefOrGetter } from 'vue'

interface DebouncedListKeywordOptions {
  debounce?: number
  maxWait?: number
}

export function useDebouncedListKeyword(
  keyword: MaybeRefOrGetter<string>,
  applyFilters: () => void | Promise<void>,
  options: DebouncedListKeywordOptions = {}
) {
  const normalizedKeyword = () => toValue(keyword).trim()
  let appliedKeyword = normalizedKeyword()

  function markApplied() {
    appliedKeyword = normalizedKeyword()
  }

  async function applyNow() {
    markApplied()
    await applyFilters()
  }

  watchDebounced(
    normalizedKeyword,
    async (value) => {
      if (value === appliedKeyword) return
      appliedKeyword = value
      await applyFilters()
    },
    {
      debounce: options.debounce ?? 250,
      maxWait: options.maxWait ?? 1000
    }
  )

  return { applyNow, markApplied }
}
