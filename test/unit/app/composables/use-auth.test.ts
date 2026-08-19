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

  it('treats an unauthorized refresh as a signed-out state', async () => {
    const state = new Map<string, ReturnType<typeof ref>>()
    const currentUser = {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      avatarUrl: '',
      role: 'admin' as const,
      locale: null
    }
    state.set('auth-user', ref(currentUser))
    state.set('auth-loading', ref(false))

    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue({ statusCode: 403 }))

    const auth = useAuth()

    await expect(auth.fetchMe(true)).resolves.toBeNull()
    expect(auth.user.value).toBeNull()
    expect(auth.loading.value).toBe(false)
  })

  it('clears refresh loading when login replaces an in-flight fetchMe', async () => {
    const state = new Map<string, ReturnType<typeof ref>>()
    state.set('auth-user', ref(null))
    state.set('auth-loading', ref(false))
    let resolveRefresh!: (value: unknown) => void
    const refresh = new Promise((resolve) => { resolveRefresh = resolve })
    const loggedInUser = {
      id: 2,
      username: 'user',
      email: 'user@example.com',
      avatarUrl: '',
      role: 'user' as const,
      locale: null
    }

    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
    vi.stubGlobal('$fetch', vi.fn((path: string) => (
      path === '/api/auth/me' ? refresh : Promise.resolve(loggedInUser)
    )))

    const auth = useAuth()
    const pendingRefresh = auth.fetchMe(true)
    expect(auth.loading.value).toBe(true)

    await auth.login({ username: 'user', password: 'password' })
    expect(auth.loading.value).toBe(false)
    expect(auth.user.value).toEqual(loggedInUser)

    resolveRefresh(null)
    await pendingRefresh
    expect(auth.loading.value).toBe(false)
  })

  it('clears refresh loading when logout replaces an in-flight fetchMe', async () => {
    const currentUser = {
      id: 3,
      username: 'user',
      email: 'user@example.com',
      avatarUrl: '',
      role: 'user' as const,
      locale: null
    }
    const state = new Map<string, ReturnType<typeof ref>>()
    state.set('auth-user', ref(currentUser))
    state.set('auth-loading', ref(false))
    let resolveRefresh!: (value: unknown) => void
    const refresh = new Promise((resolve) => { resolveRefresh = resolve })

    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
    vi.stubGlobal('$fetch', vi.fn((path: string) => (
      path === '/api/auth/me' ? refresh : Promise.resolve(null)
    )))

    const auth = useAuth()
    const pendingRefresh = auth.fetchMe(true)
    expect(auth.loading.value).toBe(true)

    await auth.logout()
    expect(auth.loading.value).toBe(false)
    expect(auth.user.value).toBeNull()

    resolveRefresh(currentUser)
    await pendingRefresh
    expect(auth.loading.value).toBe(false)
  })
})
