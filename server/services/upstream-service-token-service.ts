import { eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { upstreamServiceConnections } from '~~/server/db/schema'
import { decryptStoredSecret } from '~~/server/utils/stored-secret'
import { firstRow } from '~~/server/utils/row'

const TOKEN_CACHE_TTL_MS = 5_000
const MAX_TOKEN_CACHE_ENTRIES = 1_000

interface TokenCacheEntry {
  ciphertext: string
  token: string
  expiresAt: number
}

// The cache is deliberately process-local: plaintext Service Tokens never go
// into Redis or another shared store.  A short TTL bounds cross-instance
// staleness, while update/promote paths invalidate the local entry immediately.
const activeTokenCache = new Map<string, TokenCacheEntry>()
const controlTokenCache = new Map<string, TokenCacheEntry>()
const pendingTokenLoads = new Map<string, Promise<string>>()
const tokenCacheEpoch = new Map<string, number>()

function pruneCache(cache: Map<string, TokenCacheEntry>): void {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
  while (cache.size > MAX_TOKEN_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined
    if (!oldest) break
    cache.delete(oldest)
  }
}

async function loadToken(
  upstreamServiceId: string,
  includePending: boolean,
  cache: Map<string, TokenCacheEntry>
): Promise<string> {
  const cached = cache.get(upstreamServiceId)
  if (cached && cached.expiresAt > Date.now()) return cached.token
  if (cached) cache.delete(upstreamServiceId)

  const loadKey = `${includePending ? 'control' : 'active'}:${upstreamServiceId}`
  const epoch = tokenCacheEpoch.get(loadKey) ?? 0
  const pending = pendingTokenLoads.get(loadKey)
  if (pending) return pending

  const loading = (async () => {
    const connection = firstRow(await db.select({
      activeCiphertext: upstreamServiceConnections.serviceTokenCiphertext,
      pendingCiphertext: upstreamServiceConnections.pendingServiceTokenCiphertext
    }).from(upstreamServiceConnections)
      .where(eq(
        upstreamServiceConnections.upstreamServiceId,
        upstreamServiceId
      ))
      .limit(1))
    if (!connection) return ''

    const ciphertext = includePending
      ? connection.pendingCiphertext ?? connection.activeCiphertext
      : connection.activeCiphertext
    if (!ciphertext) return ''

    const token = decryptStoredSecret(ciphertext, 'service-token')
    // A rotation can complete while the database read is in flight. Do not
    // let that old read repopulate a cache entry invalidated by the writer.
    if ((tokenCacheEpoch.get(loadKey) ?? 0) === epoch) {
      cache.set(upstreamServiceId, {
        ciphertext,
        token,
        expiresAt: Date.now() + TOKEN_CACHE_TTL_MS
      })
      pruneCache(cache)
    }
    return token
  })()
  pendingTokenLoads.set(loadKey, loading)
  try {
    return await loading
  } finally {
    if (pendingTokenLoads.get(loadKey) === loading) {
      pendingTokenLoads.delete(loadKey)
    }
  }
}

export const upstreamServiceTokenService = {
  /** Token used by live Gateway traffic (the last verified active token). */
  get(upstreamServiceId: string): Promise<string> {
    return loadToken(upstreamServiceId, false, activeTokenCache)
  },

  /** Token used by discovery/configuration control calls (pending first). */
  getForControl(upstreamServiceId: string): Promise<string> {
    return loadToken(upstreamServiceId, true, controlTokenCache)
  },

  invalidate(upstreamServiceId: string): void {
    activeTokenCache.delete(upstreamServiceId)
    controlTokenCache.delete(upstreamServiceId)
    for (const mode of ['active', 'control'] as const) {
      const key = `${mode}:${upstreamServiceId}`
      tokenCacheEpoch.set(key, (tokenCacheEpoch.get(key) ?? 0) + 1)
      pendingTokenLoads.delete(key)
    }
  },

  clearCache(): void {
    activeTokenCache.clear()
    controlTokenCache.clear()
    pendingTokenLoads.clear()
    tokenCacheEpoch.clear()
  }
}
