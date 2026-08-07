import { effectScope, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedListKeyword } from '@/composables/dashboard/use-debounced-list-keyword'

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebouncedListKeyword', () => {
  it('applies changed keywords after the debounce interval', async () => {
    vi.useFakeTimers()
    const keyword = ref('')
    const applyFilters = vi.fn()
    const scope = effectScope()

    scope.run(() => useDebouncedListKeyword(keyword, applyFilters))
    keyword.value = '  users  '
    await nextTick()

    await vi.advanceTimersByTimeAsync(249)
    expect(applyFilters).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(applyFilters).toHaveBeenCalledOnce()
    scope.stop()
  })

  it('does not repeat a keyword applied manually', async () => {
    vi.useFakeTimers()
    const keyword = ref('')
    const applyFilters = vi.fn()
    const scope = effectScope()
    const keywordApply = scope.run(() => useDebouncedListKeyword(keyword, applyFilters))!

    keyword.value = 'logs'
    await nextTick()
    await keywordApply.applyNow()
    await vi.advanceTimersByTimeAsync(250)

    expect(applyFilters).toHaveBeenCalledOnce()
    scope.stop()
  })
})
