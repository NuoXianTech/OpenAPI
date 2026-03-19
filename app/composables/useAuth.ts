interface AuthUser {
  id: number
  username: string
  email: string
  role: string
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
      const headers = process.server ? useRequestHeaders(['cookie']) : undefined
      const res = await $fetch<ApiResponse<AuthUser | null>>('/api/auth/me', { headers })
      if (res.code === 0) {
        user.value = res.data
      }
      else {
        user.value = null
      }
    }
    finally {
      loading.value = false
    }
    return user.value
  }

  const login = async (payload: { email?: string; username?: string; password: string }) => {
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

  const register = async (payload: { username: string; email: string; password: string }) => {
    const res = await $fetch<ApiResponse<{ user: AuthUser; verificationRequired: boolean }>>('/api/auth/register', {
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
    return user.value?.role === 'admin'
  }

  return {
    user,
    loading,
    fetchMe,
    login,
    register,
    logout,
    ensureAdmin,
  }
}
