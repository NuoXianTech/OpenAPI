interface AuthUser {
  id: number
  username: string
  email: string
  avatarUrl: string
  kind: 'user' | 'admin'
  credits?: number
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => false)
  // 同一次导航中并发的 fetchMe 调用合并为同一个 Promise，避免重复请求 /api/auth/me
  const inflight = useState<Promise<AuthUser | null> | null>('auth-inflight', () => null)
  // 标记本会话是否已拉过；后续可以走 user.value 短路
  const fetched = useState<boolean>('auth-fetched', () => false)

  const runFetch = async () => {
    loading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const res = await $fetch<AuthUser | null>('/api/auth/me', { headers })
      user.value = res ?? null
    }
    catch (err) {
      // /api/auth/me 异常一律视为未登录，让中间件去重定向
      console.error('[useAuth] fetchMe failed', err)
      user.value = null
    }
    finally {
      loading.value = false
      fetched.value = true
    }
    return user.value
  }

  const fetchMe = async (force = false) => {
    if (!force && fetched.value) return user.value
    if (inflight.value) return inflight.value
    const promise = runFetch().finally(() => {
      inflight.value = null
    })
    inflight.value = promise
    return promise
  }

  const login = async (payload: { email?: string, username?: string, password: string, remember?: boolean, turnstileToken?: string }) => {
    const res = await $fetch<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: payload,
    })
    user.value = res
    fetched.value = true
    return res
  }

  const adminLogin = async (payload: { username: string, password: string, remember?: boolean, turnstileToken?: string }) => {
    const res = await $fetch<AuthUser>('/api/admin/auth/login', {
      method: 'POST',
      body: payload,
    })
    user.value = res
    fetched.value = true
    return res
  }

  const register = async (payload: { username: string, email: string, password: string, turnstileToken?: string }) => {
    return await $fetch<{ user: AuthUser, verificationRequired: boolean }>('/api/auth/register', {
      method: 'POST',
      body: payload,
    })
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    fetched.value = true
  }

  const ensureAdmin = async () => {
    if (!fetched.value) {
      await fetchMe()
    }
    return user.value?.kind === 'admin'
  }

  return {
    user,
    loading,
    fetchMe,
    login,
    adminLogin,
    register,
    logout,
    ensureAdmin,
  }
}
