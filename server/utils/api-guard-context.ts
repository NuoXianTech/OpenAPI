import type { apis } from '~~/server/db/schema'
import type { ApiStatsTarget, GateOutcome, ManifestApi, ManifestEndpoint } from '~~/server/types/api-guard'

type ApiRecord = typeof apis.$inferSelect

interface ApiMetaContext {
  api: ApiRecord
  manifest: ManifestApi
  endpoint: ManifestEndpoint
  params: Record<string, string>
  startedAt: number
}

interface ApiKeyContext {
  id: number
  userId: number
  name: string
  scopes: string[] | null
}

interface ApiKeyQuotaReservationContext {
  apiKeyId: number
  amount: number
}

interface ApiBillingContext {
  costCredits: number
  apiKeyUserId: number | null
  apiKeyQuotaReservation: ApiKeyQuotaReservationContext | null
  forcedOutcome: 'success' | 'failed' | null
  failedCode: string | null
  failedMessage: string | null
}

interface ApiGateRejectionContext {
  outcome: GateOutcome
  errorCode: string
  errorMessage: string
  apiKeyId: number | null
  apiKeyName: string | null
  apiKeyUserId: number | null
}

declare module 'h3' {
  interface H3EventContext {
    apiStatsTarget?: ApiStatsTarget
    apiMeta?: ApiMetaContext
    apiKey?: ApiKeyContext | null
    apiBilling?: ApiBillingContext
    apiGateRejection?: ApiGateRejectionContext
    requestId?: string
  }
}

export {}
