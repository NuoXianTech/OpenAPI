interface AuthUser {
  id: number
  username: string
  email: string
  avatarUrl: string
  kind: 'user' | 'admin'
  credits?: number
}

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => false)

  const fetchMe = async () => {
    loading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const res = await $fetch<ApiResponse<AuthUser | null>>('/api/auth/me', { headers })
      if (res?.code === 0) {
        user.value = res.data ?? null
      }
      else {
        user.value = null
      }
    }
    catch (err) {
      // 任何 /api/auth/me 异常都不应让上层页面崩溃；登录态置空，让中间件按未登录处理
      console.error('[useAuth] fetchMe failed', err)
      user.value = null
    }
    finally {
      loading.value = false
    }
    return user.value
  }

  const login = async (payload: { email?: string, username?: string, password: string, turnstileToken?: string }) => {
    const res = await $fetch<ApiResponse<AuthUser>>('/api/auth/login', {
      method: 'POST',
      body: payload,
    })
    if (res.code !== 0) {
      throw new Error(res.msg)
    }
    user.value = res.data
    return res.data
  }

  const adminLogin = async (payload: { username: string, password: string, turnstileToken?: string }) => {
    const res = await $fetch<ApiResponse<AuthUser>>('/api/admin/auth/login', {
      method: 'POST',
      body: payload,
    })
    if (res.code !== 0) {
      throw new Error(res.msg)
    }
    user.value = res.data
    return res.data
  }

  const register = async (payload: { username: string, email: string, password: string, turnstileToken?: string }) => {
    const res = await $fetch<ApiResponse<{ user: AuthUser, verificationRequired: boolean }>>('/api/auth/register', {
      method: 'POST',
      body: payload,
    })
    if (res.code !== 0) {
      throw new Error(res.msg)
    }
    return res.data
  }

  const logout = async () => {
    await $fetch<ApiResponse<null>>('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  const ensureAdmin = async () => {
    if (!user.value) {
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
