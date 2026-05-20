import type { LoginInput, RegisterInput } from '#shared/schemas/auth'

interface AuthUser {
  // admin 内置账号没有 users 表记录，id 为 null；普通用户为 users.id
  id: number | null
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

// 客户端模块作用域：dedup 并发的 fetchMe 调用，并记录上次成功拉取时间。
// 不放进 useState 是因为：Promise 不可序列化、SSR 时间戳 hydrate 到客户端后会被当作"刚拉过"导致跳过首次校验。
// 服务端不能复用这俩变量（Node 进程内 module-scope 会跨请求串号），中间件本身串行调用一次也不需要 dedup。
let clientInflight: Promise<AuthUser | null> | null = null
let clientFetchedAt = 0

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => false)

  const runFetch = async () => {
    loading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      // 必须用 $fetch 而不是 useAsyncData / useFetch：后者会把响应写进 nuxt payload,
      // 一旦未来开了 getCachedData / payloadExtraction，A 用户的 user 信息会跟着 HTML 投递给 B 用户。
      const res = await $fetch<AuthUser | null>('/api/auth/me', { headers })
      user.value = res ?? null
    } catch (err) {
      // /api/auth/me 异常一律视为未登录，让中间件去重定向
      console.error('[useAuth] fetchMe failed', err)
      user.value = null
    } finally {
      loading.value = false
      if (import.meta.client) clientFetchedAt = Date.now()
    }
    return user.value
  }

  const fetchMe = async (force = false) => {
    // 服务端：每次请求都重新评估登录态（中间件串行调用一次），dedup/TTL 都靠客户端兜
    if (import.meta.server) return runFetch()
    const fresh = clientFetchedAt > 0 && Date.now() - clientFetchedAt < AUTH_FRESH_FOR_MS
    if (!force && fresh) return user.value
    if (clientInflight) return clientInflight
    clientInflight = runFetch().finally(() => {
      clientInflight = null
    })
    return clientInflight
  }

  const login = async (payload: LoginInput) => {
    const res = await $fetch<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: payload
    })
    user.value = res
    if (import.meta.client) clientFetchedAt = Date.now()
    return res
  }

  const adminLogin = async (payload: { username: string, password: string, remember?: boolean, turnstileToken?: string }) => {
    const res = await $fetch<AuthUser>('/api/admin/auth/login', {
      method: 'POST',
      body: payload
    })
    user.value = res
    if (import.meta.client) clientFetchedAt = Date.now()
    return res
  }

  const register = async (payload: RegisterInput) => {
    return await $fetch<{ user: AuthUser, verificationRequired: boolean }>('/api/auth/register', {
      method: 'POST',
      body: payload
    })
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    if (import.meta.client) clientFetchedAt = Date.now()
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
    ensureAdmin
  }
}
