import { parseFetchError } from '#shared/utils/client-error'
import type { ApiKeyItem, ApiKeyPayload, ApiKeyScopeOption } from '~/types/api'

/**
 * API Key 数据层（user 与 admin 共用）：接口范围下拉的懒加载 + CRUD。
 *
 * 端点按 scope 参数化；CRUD 成功后调用注入的 `refresh`（列表数据加载由调用方负责：
 * user 页面用 useLazyFetch.refresh，admin 弹窗用按 target 用户的 load）。
 * 不在内部 toast——成功 / 失败文案两端不同，由调用方处理。
 */
interface UseApiKeysOptions {
  scope: 'user' | 'admin'
  /** CRUD 成功后刷新列表 */
  refresh: () => unknown | Promise<unknown>
  /** admin 创建时定位目标用户 */
  getUserId?: () => number | null | undefined
}

const ENDPOINTS = {
  user: {
    add: '/api/user/apikeys/add',
    update: '/api/user/apikeys/update',
    reset: '/api/user/apikeys/reset',
    remove: '/api/user/apikeys/delete',
    apisList: '/api/user/apis-list'
  },
  admin: {
    add: '/api/admin/users/apikeys/add',
    update: '/api/admin/users/apikeys/update',
    reset: '/api/admin/users/apikeys/reset',
    remove: '/api/admin/users/apikeys/delete',
    apisList: '/api/admin/apis-list'
  }
} as const

export function useApiKeys(options: UseApiKeysOptions) {
  const ep = ENDPOINTS[options.scope]
  const toast = useToast()

  // 接口范围下拉（按需懒加载一次）
  const scopeOptions = ref<ApiKeyScopeOption[]>([])
  let scopesLoaded = false
  async function ensureScopeOptions() {
    if (scopesLoaded) return
    try {
      scopeOptions.value = (await $fetch<ApiKeyScopeOption[]>(ep.apisList)) || []
      scopesLoaded = true
    } catch (err) {
      toast.add({ title: parseFetchError(err, '加载接口列表失败'), color: 'error' })
    }
  }

  const scopeSelectItems = computed(() =>
    scopeOptions.value.map(o => ({ label: `${o.name}  ${o.apiPath}`, value: o.scope }))
  )
  const scopeLabelMap = computed(() => {
    const m = new Map<string, string>()
    for (const o of scopeOptions.value) m.set(o.scope, o.name)
    return m
  })
  const allScopes = computed(() => scopeOptions.value.map(o => o.scope))

  async function create(payload: ApiKeyPayload & { count: number }) {
    const body = options.scope === 'admin'
      ? { userId: options.getUserId?.(), ...payload }
      : payload
    const res = await $fetch<{ keys: ApiKeyItem[], count: number }>(ep.add, { method: 'POST', body })
    await options.refresh()
    return res
  }

  async function update(id: number, patch: Partial<ApiKeyPayload> & { isActive?: boolean }) {
    await $fetch(ep.update, { method: 'POST', body: { id, ...patch } })
    await options.refresh()
  }

  async function reset(id: number) {
    const res = await $fetch<ApiKeyItem>(ep.reset, { method: 'POST', body: { id } })
    await options.refresh()
    return res
  }

  async function remove(id: number) {
    await $fetch(ep.remove, { method: 'POST', body: { id } })
    await options.refresh()
  }

  return {
    scopeOptions,
    scopeSelectItems,
    scopeLabelMap,
    allScopes,
    ensureScopeOptions,
    create,
    update,
    reset,
    remove
  }
}
