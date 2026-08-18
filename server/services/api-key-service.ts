import { randomBytes } from 'node:crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import { apiCalls, apiKeys } from '~~/server/db/schema'
import { clampInteger } from '~~/server/utils/number'
import { firstRow } from '~~/server/utils/row'
import { createHmacSignature } from '~~/server/utils/secure-token'
import {
  createStoredSecretPreview,
  decryptStoredSecret,
  digestStoredSecret,
  encryptStoredSecret,
  getApiKeySecret
} from '~~/server/utils/stored-secret'

const MAX_BATCH_COUNT = 5
const MAX_API_KEY_NAME_LENGTH = 100
const RANDOM_NAME_SUFFIX_LENGTH = 7

function generateApiKey() {
  const nonce = randomBytes(24)
  return `op_${createHmacSignature(nonce, getApiKeySecret())}`
}

/** 给批量创建的 key 名追加随机后缀，避免重名扎堆 */
function randomNameSuffix() {
  return randomBytes(3).toString('hex')
}

function truncateName(value: string, maxLength: number) {
  return Array.from(value).slice(0, maxLength).join('')
}

function createKeyName(baseName: string, index: number) {
  if (index === 0) return truncateName(baseName, MAX_API_KEY_NAME_LENGTH)
  return `${truncateName(baseName, MAX_API_KEY_NAME_LENGTH - RANDOM_NAME_SUFFIX_LENGTH)}-${randomNameSuffix()}`
}

type StoredApiKeyRecord = typeof apiKeys.$inferSelect
export type ApiKeyRecord = Omit<StoredApiKeyRecord, 'keyDigest' | 'keyCiphertext'>
export type CreatedApiKeyRecord = ApiKeyRecord & { apiKey: string }

function encodeApiKey(apiKey: string) {
  return {
    keyDigest: digestStoredSecret(apiKey, 'api-key'),
    keyCiphertext: encryptStoredSecret(apiKey, 'api-key'),
    keyPreview: createStoredSecretPreview(apiKey)
  }
}

function presentApiKeyRecord(row: StoredApiKeyRecord): ApiKeyRecord {
  const { keyDigest: _keyDigest, keyCiphertext: _keyCiphertext, ...record } = row
  return record
}

function revealApiKeyRecord(row: StoredApiKeyRecord): CreatedApiKeyRecord {
  return {
    ...presentApiKeyRecord(row),
    apiKey: decryptStoredSecret(row.keyCiphertext, 'api-key')
  }
}

function keyWhere(id: number, userId?: number) {
  return userId === undefined
    ? eq(apiKeys.id, id)
    : and(eq(apiKeys.id, id), eq(apiKeys.userId, userId))
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
  const row = firstRow(deleted)
  return row ? presentApiKeyRecord(row) : null
}

async function resetKey(id: number, userId?: number) {
  const nextKey = generateApiKey()
  const res = await db.update(apiKeys)
    .set({
      ...encodeApiKey(nextKey),
      updatedAt: new Date()
    })
    .where(keyWhere(id, userId))
    .returning()
  const row = firstRow(res)
  return row ? revealApiKeyRecord(row) : null
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

export const apiKeyService = {
  async listByUser(userId: number) {
    const rows = await db.select().from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt))
    return rows.map(presentApiKeyRecord)
  },

  /**
   * 创建一个或多个 API Key（单事务）。
   *
   * 批量模式（count > 1）：首个 key 用 input.name 原值；后续追加 -<6 位十六进制后缀>
   * 区分。Schema 字段 `name` 最大 100，留足够空间。
   *
   * 注意：每条 key 各自生成 nonce，所以即使批量也必须逐行 insert（不能合并 values）。
   */
  async createForUser(userId: number, input: CreateApiKeyInput): Promise<CreatedApiKeyRecord[]> {
    const count = clampInteger(input.count, 1, MAX_BATCH_COUNT)
    const baseName = (input.name || '').trim() || '默认密钥'

    return db.transaction(async (tx: DatabaseTransaction) => {
      const created: CreatedApiKeyRecord[] = []
      for (let i = 0; i < count; i++) {
        const name = createKeyName(baseName, i)
        const apiKey = generateApiKey()
        const row = await tx.insert(apiKeys).values({
          userId,
          name,
          ...encodeApiKey(apiKey),
          isActive: true,
          expiresAt: input.expiresAt ?? null,
          totalQuota: input.totalQuota ?? null,
          scopes: input.scopes ?? null,
          ipWhitelist: input.ipWhitelist ?? null
        }).returning()
        if (row[0]) created.push(revealApiKeyRecord(row[0]))
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
      const cur = await db.select().from(apiKeys).where(keyWhere(id, opts.userId)).limit(1)
      const row = firstRow(cur)
      return row ? presentApiKeyRecord(row) : null
    }

    const res = await db.update(apiKeys).set({ ...set, updatedAt: new Date() }).where(keyWhere(id, opts.userId)).returning()
    const row = firstRow(res)
    return row ? presentApiKeyRecord(row) : null
  },

  async resetForUser(userId: number, id: number) {
    return resetKey(id, userId)
  },

  async revealForUser(userId: number, id: number) {
    const rows = await db.select().from(apiKeys)
      .where(keyWhere(id, userId))
      .limit(1)
    const row = firstRow(rows)
    return row ? revealApiKeyRecord(row) : null
  },

  async resetById(id: number, userId?: number) {
    return resetKey(id, userId)
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
