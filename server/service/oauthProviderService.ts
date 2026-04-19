import { asc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { oauthProviders } from '@nuxthub/db/schema'
import { encryptSecret, isSecretMask, maskSecret } from '~~/server/utils/oauthCrypto'
import { isSupportedOauthProvider } from '~~/shared/types/oauth'

export interface OauthProviderInput {
  provider: string
  displayName: string
  icon?: string | null
  clientId: string
  clientSecret?: string | null
  scopes?: string[]
  callbackUrl: string
  authorizeUrl?: string | null
  tokenUrl?: string | null
  userInfoUrl?: string | null
  extraConfig?: Record<string, unknown> | null
  isEnabled?: boolean
  sortOrder?: number
  description?: string | null
}

type ProviderRow = typeof oauthProviders.$inferSelect

function maskRow(row: ProviderRow) {
  return { ...row, clientSecret: maskSecret(row.clientSecret) }
}

function normalizeScopes(scopes: string[] | undefined | null): string[] {
  if (!scopes) {
    return []
  }
  return Array.from(new Set(scopes.map(s => s.trim()).filter(Boolean)))
}

export const oauthProviderService = {
  async list() {
    const rows = await db.select().from(oauthProviders)
      .orderBy(asc(oauthProviders.sortOrder), asc(oauthProviders.id))
    return rows.map(maskRow)
  },

  async listEnabledPublic() {
    const rows = await db.select({
      provider: oauthProviders.provider,
      displayName: oauthProviders.displayName,
      icon: oauthProviders.icon,
      sortOrder: oauthProviders.sortOrder,
    }).from(oauthProviders)
      .where(eq(oauthProviders.isEnabled, true))
      .orderBy(asc(oauthProviders.sortOrder), asc(oauthProviders.id))
    return rows
  },

  async getById(id: number) {
    const res = await db.select().from(oauthProviders).where(eq(oauthProviders.id, id)).limit(1)
    return res[0] ? maskRow(res[0]) : null
  },

  async getByProvider(provider: string) {
    const res = await db.select().from(oauthProviders).where(eq(oauthProviders.provider, provider)).limit(1)
    return res[0] ? maskRow(res[0]) : null
  },

  async getDecryptedByProvider(provider: string) {
    const res = await db.select().from(oauthProviders).where(eq(oauthProviders.provider, provider)).limit(1)
    const row = res[0]
    if (!row) {
      return null
    }
    return row
  },

  async create(input: OauthProviderInput) {
    const provider = input.provider.trim().toLowerCase()
    if (!provider) {
      throw createError({ statusCode: 400, message: 'provider is required' })
    }
    if (!isSupportedOauthProvider(provider)) {
      throw createError({ statusCode: 400, message: 'provider not supported, only github and qq are allowed' })
    }
    if (!input.clientId || !input.clientSecret) {
      throw createError({ statusCode: 400, message: 'clientId and clientSecret are required' })
    }
    if (!input.callbackUrl) {
      throw createError({ statusCode: 400, message: 'callbackUrl is required' })
    }

    const existing = await db.select().from(oauthProviders).where(eq(oauthProviders.provider, provider)).limit(1)
    if (existing[0]) {
      throw createError({ statusCode: 409, message: 'provider already exists' })
    }

    const inserted = await db.insert(oauthProviders).values({
      provider,
      displayName: input.displayName.trim(),
      icon: input.icon ?? null,
      clientId: input.clientId.trim(),
      clientSecret: encryptSecret(input.clientSecret),
      scopes: normalizeScopes(input.scopes),
      callbackUrl: input.callbackUrl.trim(),
      authorizeUrl: input.authorizeUrl?.trim() || null,
      tokenUrl: input.tokenUrl?.trim() || null,
      userInfoUrl: input.userInfoUrl?.trim() || null,
      extraConfig: input.extraConfig ?? null,
      isEnabled: input.isEnabled ?? false,
      sortOrder: input.sortOrder ?? 0,
      description: input.description ?? null,
    }).returning()

    return maskRow(inserted[0]!)
  },

  async update(id: number, patch: Partial<OauthProviderInput>) {
    const current = await db.select().from(oauthProviders).where(eq(oauthProviders.id, id)).limit(1)
    if (!current[0]) {
      throw createError({ statusCode: 404, message: 'provider not found' })
    }

    const next: Partial<ProviderRow> = { updatedAt: new Date() }
    if (patch.displayName !== undefined) next.displayName = patch.displayName.trim()
    if (patch.icon !== undefined) next.icon = patch.icon ?? null
    if (patch.clientId !== undefined) next.clientId = patch.clientId.trim()
    if (patch.clientSecret !== undefined && !isSecretMask(patch.clientSecret)) {
      next.clientSecret = encryptSecret(patch.clientSecret!)
    }
    if (patch.scopes !== undefined) next.scopes = normalizeScopes(patch.scopes)
    if (patch.callbackUrl !== undefined) next.callbackUrl = patch.callbackUrl.trim()
    if (patch.authorizeUrl !== undefined) next.authorizeUrl = patch.authorizeUrl?.trim() || null
    if (patch.tokenUrl !== undefined) next.tokenUrl = patch.tokenUrl?.trim() || null
    if (patch.userInfoUrl !== undefined) next.userInfoUrl = patch.userInfoUrl?.trim() || null
    if (patch.extraConfig !== undefined) next.extraConfig = patch.extraConfig ?? null
    if (patch.isEnabled !== undefined) next.isEnabled = patch.isEnabled
    if (patch.sortOrder !== undefined) next.sortOrder = patch.sortOrder
    if (patch.description !== undefined) next.description = patch.description ?? null

    const res = await db.update(oauthProviders).set(next).where(eq(oauthProviders.id, id)).returning()
    return res[0] ? maskRow(res[0]) : null
  },

  async delete(id: number) {
    const res = await db.delete(oauthProviders).where(eq(oauthProviders.id, id)).returning()
    return res[0] ? maskRow(res[0]) : null
  },
}
