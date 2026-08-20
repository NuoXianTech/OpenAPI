import { eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { upstreamServiceConnections } from '~~/server/db/schema'
import { decryptStoredSecret } from '~~/server/utils/stored-secret'
import { firstRow } from '~~/server/utils/row'

export const upstreamServiceTokenService = {
  async get(upstreamServiceId: string): Promise<string> {
    const connection = firstRow(await db.select({
      ciphertext: upstreamServiceConnections.serviceTokenCiphertext
    }).from(upstreamServiceConnections)
      .where(eq(
        upstreamServiceConnections.upstreamServiceId,
        upstreamServiceId
      ))
      .limit(1))
    if (!connection) return ''

    return decryptStoredSecret(
      connection.ciphertext,
      'service-token'
    )
  }
}
