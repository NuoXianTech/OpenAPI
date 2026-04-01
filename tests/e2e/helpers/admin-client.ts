import { $fetch, fetch as e2eFetch } from '@nuxt/test-utils/e2e'

export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

type FetchMethod
  = | 'GET'
    | 'HEAD'
    | 'PATCH'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'CONNECT'
    | 'OPTIONS'
    | 'TRACE'
    | 'get'
    | 'head'
    | 'patch'
    | 'post'
    | 'put'
    | 'delete'
    | 'connect'
    | 'options'
    | 'trace'

function resolveSetCookie(headers: Headers) {
  const setCookieFromHeader = headers.get('set-cookie')
  return setCookieFromHeader || ''
}

function mergeCookieHeader(cookie: string, headers?: HeadersInit): HeadersInit {
  if (!headers) {
    return { cookie }
  }

  if (Array.isArray(headers)) {
    return [...headers, ['cookie', cookie]]
  }

  if (headers instanceof Headers) {
    const merged = new Headers(headers)
    merged.set('cookie', cookie)
    return merged
  }

  return {
    ...headers,
    cookie,
  }
}

export async function loginAsAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || ''

  const response = await e2eFetch('/api/admin/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      username: adminUsername,
      password: adminPassword,
    }),
  })

  const data = await response.json() as ApiResponse<{ id: number }>

  if (data?.code !== 0) {
    throw new Error(`Admin login failed: ${data?.msg || 'unknown error'}`)
  }

  const setCookie = resolveSetCookie(response.headers)
  const sessionCookie = setCookie.split(';')[0]

  if (!sessionCookie) {
    throw new Error('Admin login succeeded but no session cookie was returned')
  }

  return sessionCookie
}

export function createAdminClient(cookie: string) {
  return {
    get<T>(url: string, query?: Record<string, unknown>) {
      return $fetch<ApiResponse<T>>(url, {
        method: 'GET',
        query,
        headers: mergeCookieHeader(cookie),
      })
    },

    post<T>(url: string, body?: Record<string, any>) {
      return $fetch<ApiResponse<T>>(url, {
        method: 'POST',
        body,
        headers: mergeCookieHeader(cookie),
      })
    },

    put<T>(url: string, body?: Record<string, any>) {
      return $fetch<ApiResponse<T>>(url, {
        method: 'PUT',
        body,
        headers: mergeCookieHeader(cookie),
      })
    },

    raw<T>(url: string, options: {
      method?: FetchMethod
      query?: Record<string, unknown>
      body?: Record<string, any>
      headers?: HeadersInit
      ignoreResponseError?: boolean
    } = {}) {
      const method = options.method || 'GET'
      const query = options.query
      const queryString = query
        ? `?${new URLSearchParams(Object.entries(query).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value)
          }
          return acc
        }, {})).toString()}`
        : ''

      const headers = new Headers(mergeCookieHeader(cookie, options.headers))
      if (options.body && !headers.has('content-type')) {
        headers.set('content-type', 'application/json')
      }

      return e2eFetch(`${url}${queryString}`, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      }) as Promise<T extends Response ? T : Response>
    },
  }
}
