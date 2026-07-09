import { and, asc, eq, lte } from 'drizzle-orm'
import { pendingCharges } from '~~/server/db/schema'

/**
 * Pending charge retry queue for the single production Node process.
 *
 * The queue keeps failed after-response charges reliable without adding any
 * cross-process ownership model. A due row stays `pending` until this worker
 * either charges it successfully and deletes it, or records another failed
 * attempt and schedules the next retry. The unique apiCallId index prevents the
 * same API call from being enqueued more than once.
 */

const PENDING_CHARGE_MAX_ATTEMPTS = 5

const BACKOFF_SECONDS_SCHEDULE = [30, 60, 120, 300, 600]

function nextAttemptAt(attempts: number): Date {
  const index = Math.min(Math.max(attempts, 0), BACKOFF_SECONDS_SCHEDULE.length - 1)
  const seconds = BACKOFF_SECONDS_SCHEDULE[index]!
  return new Date(Date.now() + seconds * 1000)
}

interface EnqueueInput {
  apiCallId: number
  userId: number
  apiId: number
  amount: number
  remark?: string | null
  error: string
}

interface DueRow {
  id: number
  apiCallId: number
  userId: number
  apiId: number
  amount: number
  remark: string | null
  attempts: number
}

export const pendingChargeService = {
  async enqueue(input: EnqueueInput) {
    const amount = Math.max(Math.trunc(input.amount), 0)
    if (amount === 0) return

    await db.insert(pendingCharges).values({
      apiCallId: input.apiCallId,
      userId: input.userId,
      apiId: input.apiId,
      amount,
      remark: input.remark ?? null,
      attempts: 0,
      lastError: input.error.slice(0, 500),
      lastAttemptAt: new Date(),
      nextAttemptAt: new Date(),
      status: 'pending'
    }).onConflictDoNothing({ target: pendingCharges.apiCallId })
  },

  async claimDue(limit: number): Promise<DueRow[]> {
    const max = Math.max(Math.trunc(limit), 1)
    const now = new Date()

    const rows = await db.select({
      id: pendingCharges.id,
      apiCallId: pendingCharges.apiCallId,
      userId: pendingCharges.userId,
      apiId: pendingCharges.apiId,
      amount: pendingCharges.amount,
      remark: pendingCharges.remark,
      attempts: pendingCharges.attempts
    })
      .from(pendingCharges)
      .where(and(
        eq(pendingCharges.status, 'pending'),
        lte(pendingCharges.nextAttemptAt, now)
      ))
      .orderBy(asc(pendingCharges.nextAttemptAt))
      .limit(max)

    return rows.map((row: typeof rows[number]) => ({
      id: row.id,
      apiCallId: row.apiCallId,
      userId: row.userId,
      apiId: row.apiId,
      amount: row.amount,
      remark: row.remark,
      attempts: row.attempts
    }))
  },

  async markAttempt(id: number, error: string) {
    const rows = await db.select({ attempts: pendingCharges.attempts })
      .from(pendingCharges)
      .where(eq(pendingCharges.id, id))
      .limit(1)
    const current = rows[0]
    if (!current) return

    const nextAttempts = current.attempts + 1
    const truncatedError = error.slice(0, 500)
    const isDead = nextAttempts >= PENDING_CHARGE_MAX_ATTEMPTS

    await db.update(pendingCharges).set({
      attempts: nextAttempts,
      lastAttemptAt: new Date(),
      nextAttemptAt: nextAttemptAt(nextAttempts),
      lastError: truncatedError,
      status: isDead ? 'dead_letter' : 'pending'
    }).where(eq(pendingCharges.id, id))
  },

  async complete(id: number) {
    await db.delete(pendingCharges).where(eq(pendingCharges.id, id))
  }
}
