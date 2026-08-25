/**
 * 审计写入内核（唯一写入口）
 *
 * `operation_logs` 表的全部 INSERT 都必须经过这里。操作事件与登录事件此前各有一套
 * insert、各自做字段截断、各自 catch-console，导致两侧的持久化保证会各自漂移。
 * 收敛成单一入口后，截断规则、重试、降级、持久化等级只有一份实现。
 *
 * 分层：
 *   audit-log-writer（本文件）  写入语义，不含任何查询
 *     ├─ operation-log-service  操作事件的类型化门面 + 查询/清理
 *     └─ login-log-service      登录事件的类型化门面 + 查询/清理
 *
 * 上层门面保留各自的输入类型（而不是让调用方直接拼这里的通用结构），
 * 这样登录事件的 `detail` 形状仍然是编译期受约束的——它的查询侧依赖
 * `detail->>'method'`，退化成任意 jsonb 会让那些查询在类型上失去保护。
 */
import { resolveAuditCriticality, type AuditAction, type AuditCriticality } from '#shared/config/audit-actions'
import { db } from '~~/server/db/client'
import { operationLogs } from '~~/server/db/schema'

export type AuditLogStatus = 'success' | 'failure'

export interface AuditLogEntry {
  action: AuditAction
  userId?: number | null
  actor?: string | null
  resourceType?: string | null
  resourceId?: string | number | null
  ip?: string | null
  userAgent?: string | null
  detail?: Record<string, unknown> | null
  status?: AuditLogStatus
}

/**
 * 把审计条目裁剪成符合列宽的行。
 *
 * 截断只在这里发生一次。列宽定义见 server/db/schema/system.ts，超长值截断而非报错：
 * 审计的价值在于留下记录，不该因为一个过长的 UA 就丢掉整条。
 */
function toAuditLogRow(entry: AuditLogEntry) {
  return {
    userId: entry.userId ?? null,
    actor: entry.actor?.slice(0, 140) ?? null,
    action: entry.action,
    resourceType: entry.resourceType ?? null,
    resourceId: entry.resourceId !== null && entry.resourceId !== undefined
      ? String(entry.resourceId).slice(0, 120)
      : null,
    ip: entry.ip ?? null,
    userAgent: entry.userAgent?.slice(0, 500) ?? null,
    detail: entry.detail ?? null,
    status: entry.status || 'success'
  }
}

async function insertAuditLog(entry: AuditLogEntry): Promise<void> {
  await db.insert(operationLogs).values(toAuditLogRow(entry))
}

/**
 * 审计降级出口：落库彻底失败时，把审计行以单行 JSON 打到 stderr。
 *
 * 前缀是稳定的可 grep 标记，供日志采集侧还原成审计记录。审计的价值在于事后可追溯，
 * 因此「进程外可恢复」比「进程内静默丢弃」重要得多。
 */
const AUDIT_FALLBACK_MARKER = 'AUDIT_FALLBACK'

function writeAuditFallback(entry: AuditLogEntry, error: unknown): void {
  const row = toAuditLogRow(entry)
  const payload = {
    marker: AUDIT_FALLBACK_MARKER,
    occurredAt: new Date().toISOString(),
    reason: error instanceof Error ? error.message : String(error),
    log: row
  }
  try {
    console.error(`${AUDIT_FALLBACK_MARKER} ${JSON.stringify(payload)}`)
  } catch {
    // detail 里含循环引用等无法序列化的值时，至少保留动作码与操作者。
    console.error(`${AUDIT_FALLBACK_MARKER} ${JSON.stringify({
      marker: AUDIT_FALLBACK_MARKER,
      occurredAt: payload.occurredAt,
      reason: payload.reason,
      log: { action: row.action, actor: row.actor, userId: row.userId, status: row.status }
    })}`)
  }
}

/**
 * 写入审计行，瞬时故障重试一次。
 *
 * 重试**不适用于 gate 级动作**。重试不是幂等的：若第一次 INSERT 实际已提交、
 * 只是响应在返回途中丢失，重试就会写入第二条。对 reveal 这类明文披露动作，
 * 两条记录会让排查者合理地认为密钥被查看了两次——在最需要准确的记录上制造假信号。
 * gate 级本来就会把失败上抛给调用方（明文不交付），因此宁缺勿重。
 *
 * durable / standard 级接受这个代价：它们的替代结果是彻底没有记录，
 * 而重复记录至少保留了「这件事发生过」这个事实。
 */
async function insertWithRetry(entry: AuditLogEntry, criticality: AuditCriticality): Promise<void> {
  try {
    await insertAuditLog(entry)
  } catch (error) {
    if (criticality === 'gate') throw error
    console.error('failed to write audit log, retrying once', { action: entry.action, error })
    await insertAuditLog(entry)
  }
}

/**
 * 记录一条审计事件。行为由动作码的持久化等级决定（见 shared/config/audit-actions.ts）：
 *
 * - `gate`     重试后仍失败则抛错，中止请求。用于审计必须先于敏感效果落地的场景。
 * - `durable`  重试后仍失败则降级到 stderr，不中止请求。业务变更已落库，
 *              抛错既无法回滚，也只会把成功的操作报成失败。
 * - `standard` 同 durable，但只做常规告警。
 *
 * 调用方不需要（也不应该）自己判断某个动作能不能丢：策略集中在注册表里，
 * 新增事件因此默认继承正确行为。
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  const criticality = resolveAuditCriticality(entry.action)
  try {
    await insertWithRetry(entry, criticality)
  } catch (error) {
    writeAuditFallback(entry, error)
    if (criticality === 'gate') throw error
  }
}
