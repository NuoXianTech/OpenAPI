/**
 * Manifest 运行时读取 + 索引 + endpoint 匹配。
 *
 * - byVersionCode：'v1:user' → ManifestApi，O(1) 查找
 * - 预编译正则：模块初始化时一次性编译，匹配零开销
 * - matchEndpoint：在 ManifestApi 的 endpoints 内线性扫（通常 < 10）
 */

import { API_MANIFEST } from '#api-manifest'
import type { EndpointMatch, ManifestApi, ManifestEndpoint } from '~~/shared/types/api-guard'

interface CompiledEndpoint {
  endpoint: ManifestEndpoint
  regex: RegExp
}

interface CompiledApi {
  api: ManifestApi
  endpoints: CompiledEndpoint[]
}

let byVersionCodeCache: Map<string, CompiledApi> | null = null

function ensureIndex(): Map<string, CompiledApi> {
  if (byVersionCodeCache) return byVersionCodeCache
  const map = new Map<string, CompiledApi>()
  for (const api of API_MANIFEST) {
    const compiled: CompiledEndpoint[] = api.endpoints.map(ep => ({
      endpoint: ep,
      regex: new RegExp(ep.patternRegex),
    }))
    map.set(`${api.pathVersion}:${api.code}`, { api, endpoints: compiled })
  }
  byVersionCodeCache = map
  return map
}

export function getManifestApi(pathVersion: string, code: string): ManifestApi | null {
  const compiled = ensureIndex().get(`${pathVersion}:${code}`)
  return compiled ? compiled.api : null
}

export function listManifestApis(): ManifestApi[] {
  return API_MANIFEST
}

/**
 * 在某个 ManifestApi 下寻找匹配的 endpoint。
 * 优先方法精确匹配，其次 ANY（无方法限定）。
 */
export function matchEndpoint(
  pathVersion: string,
  code: string,
  pathname: string,
  method: string,
): EndpointMatch | null {
  const compiled = ensureIndex().get(`${pathVersion}:${code}`)
  if (!compiled) return null

  let fallbackAny: CompiledEndpoint | null = null
  let fallbackAnyMatch: RegExpExecArray | null = null

  const upperMethod = method.toUpperCase()
  for (const ce of compiled.endpoints) {
    const match = ce.regex.exec(pathname)
    if (!match) continue
    if (ce.endpoint.method === upperMethod) {
      return toEndpointMatch(ce.endpoint, match)
    }
    if (ce.endpoint.method === 'ANY' && !fallbackAny) {
      fallbackAny = ce
      fallbackAnyMatch = match
    }
  }

  if (fallbackAny && fallbackAnyMatch) {
    return toEndpointMatch(fallbackAny.endpoint, fallbackAnyMatch)
  }
  return null
}

function toEndpointMatch(endpoint: ManifestEndpoint, match: RegExpExecArray): EndpointMatch {
  const params: Record<string, string> = {}
  endpoint.paramNames.forEach((name, i) => {
    const value = match[i + 1]
    if (value !== undefined) params[name] = value
  })
  return { endpoint, params }
}
