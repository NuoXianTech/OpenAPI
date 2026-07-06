import { and, eq, sql, lt, isNull, or } from 'drizzle-orm'
import { creditTransactions, users } from '@nuxthub/db/schema'
import { toNumber } from '~~/server/utils/number'
import { siteSettingsService } from './site-settings-service'

/**
 * 每日签到服务
 *
 * 支持两种冷却模式：
 *   - hours: 距上次签到 N 小时之后才能再签
 *   - fixed_time: 每日固定 HH:mm 刷新（如 00:00），lastCheckinAt 早于「最近一次刷新时刻」即可签
 *
 * 原子性：所有冷却判定通过 UPDATE ... WHERE 收紧；事务内重复请求只会有一条命中。
 */

type CheckinStatusCode = 'DISABLED' | 'COOLDOWN' | 'OK'
type CheckinCooldownMode = 'hours' | 'fixed_time'

interface CheckinStatus {
  enabled: boolean
  canCheckin: boolean
  reason: CheckinStatusCode
  lastCheckinAt: string | null
  nextCheckinAt: string | null
  cooldownMode: CheckinCooldownMode
  refreshHours: number
  fixedRefreshTime: string
  mode: 'fixed' | 'range'
  amountFixed: number
  amountMin: number
  amountMax: number
  requiresTurnstile: boolean
}

interface CheckinResult {
  amount: number
  balanceAfter: number
  checkedAt: string
  nextCheckinAt: string
}

function pickAmount(mode: string, fixed: number, min: number, max: number): number {
  if (mode === 'range') {
    const lo = Math.max(Math.min(min, max), 0)
    const hi = Math.max(min, max)
    if (hi <= lo) return lo
    return lo + Math.floor(Math.random() * (hi - lo + 1))
  }
  return Math.max(fixed, 0)
}

function parseFixedTime(raw: string): { h: number, m: number } {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(raw || '')
  if (!match) return { h: 0, m: 0 }
  return { h: Number(match[1]), m: Number(match[2]) }
}

/** 返回「最近一次 HH:mm 刷新时刻」（小于等于 now） */
function lastFixedBoundary(now: Date, h: number, m: number): Date {
  const candidate = new Date(now)
  candidate.setHours(h, m, 0, 0)
  if (candidate.getTime() > now.getTime()) {
    candidate.setDate(candidate.getDate() - 1)
  }
  return candidate
}

/** 返回「下一次 HH:mm 刷新时刻」（严格大于 now） */
function nextFixedBoundary(now: Date, h: number, m: number): Date {
  const candidate = new Date(now)
  candidate.setHours(h, m, 0, 0)
  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1)
  }
  return candidate
}

function computeCutoffAndNext(
  cooldownMode: CheckinCooldownMode,
  lastAt: Date | null,
  now: Date,
  refreshHours: number,
  fixedRefreshTime: string
): { cutoff: Date, nextAt: Date | null } {
  if (cooldownMode === 'fixed_time') {
    const { h, m } = parseFixedTime(fixedRefreshTime)
    const lastBoundary = lastFixedBoundary(now, h, m)
    // 已签到时间早于「最近一次刷新时刻」即可再签
    // nextAt：如果上次签到时间晚于 lastBoundary，那么下一次可签时间是下一个刷新点
    let nextAt: Date | null = null
    if (lastAt && lastAt.getTime() >= lastBoundary.getTime()) {
      nextAt = nextFixedBoundary(now, h, m)
    }
    return { cutoff: lastBoundary, nextAt }
  }
  // hours 模式
  const hours = Math.max(1, refreshHours)
  const cutoff = new Date(now.getTime() - hours * 3600_000)
  const nextAt = lastAt ? new Date(lastAt.getTime() + hours * 3600_000) : null
  return { cutoff, nextAt }
}

export const checkinService = {
  async getStatus(userId: number): Promise<CheckinStatus> {
    const [settings, userRow] = await Promise.all([
      siteSettingsService.getOrCreate(),
      db.select({ lastCheckinAt: users.lastCheckinAt }).from(users).where(eq(users.id, userId)).limit(1)
    ])
    const last = userRow[0]?.lastCheckinAt ?? null
    const cooldownMode = (settings.checkinCooldownMode === 'fixed_time' ? 'fixed_time' : 'hours') as CheckinCooldownMode
    const refreshHours = Math.max(1, settings.checkinRefreshHours)
    const now = new Date()
    const { nextAt } = computeCutoffAndNext(cooldownMode, last, now, refreshHours, settings.checkinFixedRefreshTime)
    const cooling = nextAt ? nextAt.getTime() > now.getTime() : false
    const enabled = settings.checkinEnabled
    const canCheckin = enabled && !cooling

    const mode = (settings.checkinMode === 'range' ? 'range' : 'fixed') as 'fixed' | 'range'
    return {
      enabled,
      canCheckin,
      reason: !enabled ? 'DISABLED' : (cooling ? 'COOLDOWN' : 'OK'),
      lastCheckinAt: last ? last.toISOString() : null,
      nextCheckinAt: nextAt ? nextAt.toISOString() : null,
      cooldownMode,
      refreshHours,
      fixedRefreshTime: settings.checkinFixedRefreshTime,
      mode,
      amountFixed: settings.checkinAmountFixed,
      amountMin: settings.checkinAmountMin,
      amountMax: settings.checkinAmountMax,
      requiresTurnstile: Boolean(settings.turnstileSiteKey)
        && Boolean(settings.turnstileSecretKey)
        && settings.turnstileCheckinEnabled
    }
  },

  /**
   * 执行签到。事务内：
   *   1. 校验 settings.checkinEnabled
   *   2. UPDATE users SET lastCheckinAt = now() WHERE id = userId AND (lastCheckinAt IS NULL OR lastCheckinAt < cutoff)
   *   3. UPDATE users SET credits = credits + amount RETURNING credits
   *   4. INSERT credit_transactions
   */
  async checkin(userId: number): Promise<CheckinResult> {
    const settings = await siteSettingsService.getOrCreate()
    if (!settings.checkinEnabled) {
      const err = new Error('签到功能已关闭') as Error & { code: string }
      err.code = 'DISABLED'
      throw err
    }

    const cooldownMode = (settings.checkinCooldownMode === 'fixed_time' ? 'fixed_time' : 'hours') as CheckinCooldownMode
    const refreshHours = Math.max(1, settings.checkinRefreshHours)
    const amount = pickAmount(settings.checkinMode, settings.checkinAmountFixed, settings.checkinAmountMin, settings.checkinAmountMax)
    const now = new Date()
    const { cutoff } = computeCutoffAndNext(cooldownMode, null, now, refreshHours, settings.checkinFixedRefreshTime)

    return db.transaction(async (tx: typeof db) => {
      // 原子声明本次签到时间：要求 lastCheckinAt 为空或在 cutoff 之前
      const claimed = await tx.update(users)
        .set({ lastCheckinAt: now, updatedAt: now })
        .where(and(
          eq(users.id, userId),
          or(isNull(users.lastCheckinAt), lt(users.lastCheckinAt, cutoff))!
        ))
        .returning({ id: users.id, lastCheckinAt: users.lastCheckinAt })
      if (!claimed[0]) {
        const err = new Error('当前还在签到冷却期内') as Error & { code: string }
        err.code = 'COOLDOWN'
        throw err
      }

      let balanceAfter: number
      if (amount > 0) {
        const credited = await tx.update(users)
          .set({ credits: sql`${users.credits} + ${amount}`, updatedAt: now })
          .where(eq(users.id, userId))
          .returning({ credits: users.credits })
        balanceAfter = toNumber(credited[0]?.credits)
      } else {
        const row = await tx.select({ credits: users.credits }).from(users).where(eq(users.id, userId)).limit(1)
        balanceAfter = toNumber(row[0]?.credits)
      }

      await tx.insert(creditTransactions).values({
        userId,
        amount,
        balanceAfter,
        reason: 'checkin',
        operatorId: null,
        operatorName: null,
        remark: settings.checkinMode === 'range'
          ? `签到（区间 ${settings.checkinAmountMin}~${settings.checkinAmountMax}）`
          : '签到',
        meta: {
          mode: settings.checkinMode,
          cooldownMode,
          refreshHours,
          fixedRefreshTime: settings.checkinFixedRefreshTime
        }
      })

      const checkedAt = claimed[0].lastCheckinAt as Date
      const { nextAt } = computeCutoffAndNext(cooldownMode, checkedAt, checkedAt, refreshHours, settings.checkinFixedRefreshTime)
      const finalNextAt = nextAt ?? new Date(checkedAt.getTime() + Math.max(1, refreshHours) * 3600_000)
      return {
        amount,
        balanceAfter,
        checkedAt: checkedAt.toISOString(),
        nextCheckinAt: finalNextAt.toISOString()
      }
    })
  }
}

export function isCheckinError(err: unknown): err is Error & { code: string } {
  return err instanceof Error && typeof (err as Error & { code?: string }).code === 'string'
}
