import { createHmac, randomBytes } from 'node:crypto'
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm'
import { apiCalls, apiKeys } from '~~/server/db/schema'
import { firstRow } from '~~/server/utils/row'
import type { DatabaseTransaction } from '~~/server/db/client'

const SECRET_BYTES = 32
const MAX_BATCH_COUNT = 5

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

function parseSecret(raw: string): Buffer {
  if (!raw) {
    throw new Error('API_KEY_SECRET is not configured')
  }
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === SECRET_BYTES * 2) {
    return Buffer.from(raw, 'hex')
  }
  const decoded = base64UrlDecode(raw)
  if (decoded.length === SECRET_BYTES) {
    return decoded
  }
  const utf8 = Buffer.from(raw, 'utf8')
  if (utf8.length === SECRET_BYTES) {
    return utf8
  }
  throw new Error(`API_KEY_SECRET must be ${SECRET_BYTES} bytes (hex / base64url / utf-8)`)
}

let cachedSecret: Buffer | null = null

function getSecret() {
  if (cachedSecret) return cachedSecret
  const raw = useRuntimeConfig().auth.apiKeySecret as string
  cachedSecret = parseSecret(raw)
  return cachedSecret
}

function generateApiKey() {
  const nonce = randomBytes(24)
  return `op_${createHmac('sha256', getSecret()).update(nonce).digest('base64url')}`
}

/** 给批量创建的 key 名追加随机后缀，避免重名扎堆 */
function randomNameSuffix() {
  return randomBytes(3).toString('hex')
}

function keyWhere(id: number, userId?: number) {
  return userId === undefined
    ? eq(apiKeys.id, id)
    : and(eq(apiKeys.id, id), eq(apiKeys.userId, userId))
}

function activeKeyWhere(id: number, userId?: number) {
  return userId === undefined
    ? and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt))
    : and(eq(apiKeys.id, id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt))
}

async function deleteKey(tx: DatabaseTransaction, id: number, userId?: number) {
  const rows = await tx.select().from(apiKeys)
    .where(keyWhere(id, userId))
    .limit(1)
  const key = rows[0]
  if (!key) return null

  await tx.update(apiCalls)
    .set({
      apiKeyName: sql`coalesce(${apiCalls.apiKeyName}, ${key.name})`,
      apiKeyId: null
    })
    .where(eq(apiCalls.apiKeyId, key.id))

  const deleted = await tx.delete(apiKeys)
    .where(eq(apiKeys.id, key.id))
    .returning()
  return firstRow(deleted)
}

async function resetKey(id: number, userId?: number) {
  const nextKey = generateApiKey()
  const res = await db.update(apiKeys)
    .set({
      apiKey: nextKey,
      updatedAt: new Date()
    })
    .where(activeKeyWhere(id, userId))
    .returning()
  return firstRow(res)
}

/** 用户创建 API Key 的入参 */
interface CreateApiKeyInput {
  name?: string | null
  /** 过期时刻；null = 永不过期 */
  expiresAt?: Date | null
  /** Key 累计消耗积分上限；null = 无限 */
  totalQuota?: number | null
  /** 接口范围；null / [] = 全部 */
  scopes?: string[] | null
  /** IP 白名单（CIDR 数组）；null / [] = 全部 */
  ipWhitelist?: string[] | null
  /** 批量数量 1-5；首个用 name 原值，后续追加随机后缀 */
  count?: number
}

type ApiKeyRecord = typeof apiKeys.$inferSelect

export const apiKeyService = {
  async listByUser(userId: number) {
    return db.select().from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
      .orderBy(desc(apiKeys.createdAt))
  },

  /**
   * 创建一个或多个 API Key（单事务）。
   *
   * 批量模式（count > 1）：首个 key 用 input.name 原值；后续追加 -<6 位十六进制后缀>
   * 区分。Schema 字段 `name` 最大 100，留足够空间。
   *
   * 注意：每条 key 各自生成 nonce，所以即使批量也必须逐行 insert（不能合并 values）。
   */
  async createForUser(userId: number, input: CreateApiKeyInput): Promise<ApiKeyRecord[]> {
    const count = Math.max(1, Math.min(Math.trunc(input.count ?? 1), MAX_BATCH_COUNT))
    const baseName = (input.name || '').trim() || '默认密钥'

    return db.transaction(async (tx: DatabaseTransaction) => {
      const created: ApiKeyRecord[] = []
      for (let i = 0; i < count; i++) {
        const name = i === 0 ? baseName : `${baseName}-${randomNameSuffix()}`
        const row = await tx.insert(apiKeys).values({
          userId,
          name,
          apiKey: generateApiKey(),
          isActive: true,
          expiresAt: input.expiresAt ?? null,
          totalQuota: input.totalQuota ?? null,
          scopes: input.scopes ?? null,
          ipWhitelist: input.ipWhitelist ?? null
        }).returning()
        if (row[0]) created.push(row[0])
      }
      return created
    })
  },

  async deleteForUser(userId: number, id: number) {
    return db.transaction((tx: DatabaseTransaction) => deleteKey(tx, id, userId))
  },

  async deleteById(id: number) {
    return db.transaction((tx: DatabaseTransaction) => deleteKey(tx, id))
  },

  /**
   * 更新一个 Key 的可配置字段。
   *
   * 入参以 undefined 表示"不修改"、null 表示"清空（无限/全部/永不过期）"。
   * userId 非空时校验 Key 归属，避免越权改别人的 Key。
   */
  async updateConfig(id: number, patch: {
    name?: string
    expiresAt?: Date | null
    totalQuota?: number | null
    scopes?: string[] | null
    ipWhitelist?: string[] | null
    isActive?: boolean
  }, opts: { userId?: number } = {}): Promise<ApiKeyRecord | null> {
    const set: Partial<typeof apiKeys.$inferInsert> = {}
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim()
      set.name = trimmed || '默认密钥'
    }
    if (patch.expiresAt !== undefined) set.expiresAt = patch.expiresAt
    if (patch.totalQuota !== undefined) set.totalQuota = patch.totalQuota
    if (patch.scopes !== undefined) set.scopes = patch.scopes
    if (patch.ipWhitelist !== undefined) set.ipWhitelist = patch.ipWhitelist
    if (patch.isActive !== undefined) set.isActive = patch.isActive

    if (Object.keys(set).length === 0) {
      const cur = await db.select().from(apiKeys).where(activeKeyWhere(id, opts.userId)).limit(1)
      return firstRow(cur)
    }

    const res = await db.update(apiKeys).set({ ...set, updatedAt: new Date() }).where(activeKeyWhere(id, opts.userId)).returning()
    return firstRow(res)
  },

  async resetForUser(userId: number, id: number) {
    return resetKey(id, userId)
  },

  async resetById(id: number, userId?: number) {
    return resetKey(id, userId)
  },

  /**
   * 在 gate 阶段原子预占 API Key 使用额度。
   *
   * 这一步同时覆盖"无限配额"与"有限 totalQuota"两类 key：
   * - totalQuota = null：直接累加 usedCredits，用作真实使用量统计
   * - totalQuota 有值：只有 usedCredits + amount <= totalQuota 时才累加
   *
   * 预占成功后，成功调用无需再二次累加；业务失败 / 非扣费响应必须调用
   * releaseReservedCredits 释放预占额度。
   */
  async reserveUsedCredits(id: number, amount: number): Promise<boolean> {
    const delta = Math.max(Math.trunc(amount), 0)
    if (delta === 0) return true

    const rows = await db.update(apiKeys)
      .set({
        usedCredits: sql`${apiKeys.usedCredits} + ${delta}`,
        updatedAt: new Date()
      })
      .where(and(
        eq(apiKeys.id, id),
        isNull(apiKeys.revokedAt),
        eq(apiKeys.isActive, true),
        or(
          isNull(apiKeys.totalQuota),
          sql`${apiKeys.usedCredits} + ${delta} <= ${apiKeys.totalQuota}`
        )!
      ))
      .returning({ id: apiKeys.id })

    return Boolean(rows[0])
  },

  /**
   * 释放 gate 阶段的额度预占。使用 greatest 防御重复释放或并发修正导致的负数。
   */
  async releaseReservedCredits(id: number, amount: number): Promise<void> {
    const delta = Math.max(Math.trunc(amount), 0)
    if (delta === 0) return

    await db.update(apiKeys)
      .set({
        usedCredits: sql`greatest(${apiKeys.usedCredits} - ${delta}, 0)`,
        updatedAt: new Date()
      })
      .where(eq(apiKeys.id, id))
  },

  /**
   * 记录一次使用：更新 lastUsedAt/lastUsedIp 并累加 totalCalls。
   * 调用方（middleware）应 fire-and-forget，失败不影响业务。
   */
  async recordUsage(id: number, ip: string | null) {
    await db.update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        lastUsedIp: ip,
        totalCalls: sql`${apiKeys.totalCalls} + 1`
      })
      .where(eq(apiKeys.id, id))
  }
}
