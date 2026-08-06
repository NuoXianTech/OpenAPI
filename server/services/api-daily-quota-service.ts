import { and, eq, lt, sql } from 'drizzle-orm'
import { apiDailyQuotaUsage } from '~~/server/db/schema'
import type { DatabaseTransaction } from '~~/server/db/client'
import { toLocalDateKey } from '~~/server/utils/local-time'

/**
 * 原子预占一次 API 每日配额。
 *
 * 先确保当天计数器存在，再通过带 usedCount < limit 条件的 UPDATE 自增。
 * UPDATE 的行锁保证多实例并发下最多只有 limit 次调用能够成功预占。
 */
export async function reserveApiDailyQuota(apiId: number, limit: number, value = new Date()): Promise<boolean> {
  const normalizedLimit = Math.max(Math.trunc(limit), 0)
  if (normalizedLimit === 0) return true

  const usageDate = toLocalDateKey(value)
  return db.transaction(async (tx: DatabaseTransaction) => {
    await tx.insert(apiDailyQuotaUsage).values({
      apiId,
      usageDate,
      usedCount: 0
    }).onConflictDoNothing({
      target: [apiDailyQuotaUsage.apiId, apiDailyQuotaUsage.usageDate]
    })

    const reserved = await tx.update(apiDailyQuotaUsage)
      .set({
        usedCount: sql`${apiDailyQuotaUsage.usedCount} + 1`,
        updatedAt: new Date()
      })
      .where(and(
        eq(apiDailyQuotaUsage.apiId, apiId),
        eq(apiDailyQuotaUsage.usageDate, usageDate),
        lt(apiDailyQuotaUsage.usedCount, normalizedLimit)
      ))
      .returning({ apiId: apiDailyQuotaUsage.apiId })

    return Boolean(reserved[0])
  })
}
