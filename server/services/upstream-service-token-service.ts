import { eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { upstreamServiceConnections } from '~~/server/db/schema'
import { decryptStoredSecret } from '~~/server/utils/stored-secret'
import { firstRow } from '~~/server/utils/row'

const TOKEN_CACHE_TTL_MS = 60_000
const tokenCache = new Map<string, { token: string, expiresAt: number }>()

export function invalidateUpstreamServiceToken(upstreamServiceId: string) {
  tokenCache.delete(upstreamServiceId)
}

export const upstreamServiceTokenService = {
  async get(upstreamServiceId: string): Promise<string> {
    const cached = tokenCache.get(upstreamServiceId)
    if (cached && cached.expiresAt > Date.now()) return cached.token

    const connection = firstRow(await db.select({
      ciphertext: upstreamServiceConnections.serviceTokenCiphertext
    }).from(upstreamServiceConnections)
      .where(eq(
        upstreamServiceConnections.upstreamServiceId,
        upstreamServiceId
      ))
      .limit(1))
    if (!connection) return ''

    const token = decryptStoredSecret(
      connection.ciphertext,
      'service-token'
    )
    tokenCache.set(upstreamServiceId, {
      token,
      expiresAt: Date.now() + TOKEN_CACHE_TTL_MS
    })
    return token
  }
}
