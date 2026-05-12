import type { LoginInput, RegisterInput } from '#shared/schemas/auth'

interface AuthUser {
  id: number
  username: string
  displayName?: string | null
  email: string
  avatarUrl: string
  kind: 'user' | 'admin'
  credits?: number
}

// 登录态新鲜期：超过这个时长后，下一次 fetchMe()（中间件导航 / 插件定时器）会重新打 /api/auth/me，
// 用来在长会话里捕获后端封禁、踢人、session 失效等服务端状态变化。
const AUTH_FRESH_FOR_MS = 5 * 60 * 1000

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => false)
  // 同一次导航中并发的 fetchMe 调用合并为同一个 Promise，避免重复请求 /api/auth/me
  const inflight = useState<Promise<AuthUser | null> | null>('auth-inflight', () => null)
  // 上次成功拉取 /api/auth/me 的时间戳（毫秒，0 表示尚未拉过）
  const fetchedAt = useState<number>('auth-fetched-at', () => 0)

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
      fetchedAt.value = Date.now()
    }
    return user.value
  }

  const fetchMe = async (force = false) => {
    const fresh = fetchedAt.value > 0 && Date.now() - fetchedAt.value < AUTH_FRESH_FOR_MS
    if (!force && fresh) return user.value
    if (inflight.value) return inflight.value
    const promise = runFetch().finally(() => {
      inflight.value = null
    })
    inflight.value = promise
    return promise
  }

  const login = async (payload: LoginInput) => {
    const res = await $fetch<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: payload,
    })
    user.value = res
    fetchedAt.value = Date.now()
    return res
  }

  const adminLogin = async (payload: { username: string, password: string, remember?: boolean, turnstileToken?: string }) => {
    const res = await $fetch<AuthUser>('/api/admin/auth/login', {
      method: 'POST',
      body: payload,
    })
    user.value = res
    fetchedAt.value = Date.now()
    return res
  }

  const register = async (payload: RegisterInput) => {
    return await $fetch<{ user: AuthUser, verificationRequired: boolean }>('/api/auth/register', {
      method: 'POST',
      body: payload,
    })
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    fetchedAt.value = Date.now()
  }

  const ensureAdmin = async () => {
    await fetchMe()
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
