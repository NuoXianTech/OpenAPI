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

/**
 * 计费上下文 · gate 通过时挂载，后置 stats 中间件读取以决定扣款。
 *
 * - costCredits：本次调用单价（来自 apis.costCredits）
 * - apiKeyUserId：扣款账户（仅当带 apiKey 时有值）
 * - forcedOutcome：业务 handler 主动标记的结果，覆盖 statusCode 判定
 *   * 'success' → 强制视为成功，照常扣款
 *   * 'failed'  → 强制视为失败，跳过扣款（即使 statusCode=200）
 * - failedCode / failedMessage：业务标记失败时的明细，写入 apiCalls.errorCode/errorMessage
 */
export interface ApiBillingContext {
  costCredits: number
  apiKeyUserId: number | null
  forcedOutcome: 'success' | 'failed' | null
  failedCode: string | null
  failedMessage: string | null
}

declare module 'h3' {
  interface H3EventContext {
    apiStatsTarget?: ApiStatsTarget
    apiMeta?: ApiMetaContext
    apiKey?: ApiKeyContext | null
    apiBilling?: ApiBillingContext
  }
}

export {}
