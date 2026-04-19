/**
 * h3 H3EventContext 的扩展声明。
 *
 * 由 gate 中间件设置，后置中间件 / 业务 handler 读取：
 * - apiStatsTarget：命中 apis 记录即设置（覆盖成功与被拒两种情形）
 * - apiMeta / apiKey：仅 gate 全规则通过后设置
 */

import type { apiKeys, apis } from '@nuxthub/db/schema'
import type { ApiStatsTarget, ManifestApi, ManifestEndpoint } from '~~/shared/types/api-guard'

export type ApiRecord = typeof apis.$inferSelect
export type ApiKeyRecord = typeof apiKeys.$inferSelect

export interface ApiMetaContext {
  api: ApiRecord
  manifest: ManifestApi
  endpoint: ManifestEndpoint
  params: Record<string, string>
  startedAt: number
}

export interface ApiKeyContext {
  id: number
  userId: number
  scopes: string[] | null
}

declare module 'h3' {
  interface H3EventContext {
    apiStatsTarget?: ApiStatsTarget
    apiMeta?: ApiMetaContext
    apiKey?: ApiKeyContext | null
  }
}

export {}
