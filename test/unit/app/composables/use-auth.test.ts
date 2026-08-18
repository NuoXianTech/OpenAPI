import { computed, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/composables/use-auth'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAuth', () => {
  it('propagates refresh failures without clearing the current user', async () => {
    const state = new Map<string, ReturnType<typeof ref>>()
    const currentUser = {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      avatarUrl: '',
      role: 'admin',
      locale: null
    }
    state.set('auth-user', ref(currentUser))
    state.set('auth-loading', ref(false))

    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('database unavailable')))

    const auth = useAuth()

    await expect(auth.fetchMe(true)).rejects.toThrow('database unavailable')
    expect(auth.user.value).toEqual(currentUser)
    expect(auth.loading.value).toBe(false)
  })
})
