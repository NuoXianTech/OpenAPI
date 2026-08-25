import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  AUDIT_ACTIONS,
  auditActionMessageKey,
  LOGIN_ACTION_PREFIX,
  LOGIN_LOG_ACTIONS,
  OPERATION_LOG_ACTIONS,
  resolveAuditCriticality
} from '#shared/config/audit-actions'

const LOCALES = ['zh-CN', 'en-US'] as const

function readActionLabels(locale: string): Record<string, string> {
  const json = JSON.parse(readFileSync(`i18n/locales/${locale}/admin/logs.json`, 'utf8'))
  return json?.admin?.logs?.operations?.actionLabels ?? {}
}

function labelKeyFor(action: string): string {
  return auditActionMessageKey(action).replace('admin.logs.operations.actionLabels.', '')
}

describe('audit action registry', () => {
  it.each(LOCALES)('%s defines a label for every operation-log action', (locale) => {
    const labels = readActionLabels(locale)
    const missing = Object.keys(OPERATION_LOG_ACTIONS).filter(action => !(labelKeyFor(action) in labels))
    expect(missing).toEqual([])
  })

  it.each(LOCALES)('%s has no label for an unregistered action', (locale) => {
    const labels = readActionLabels(locale)
    const registered = new Set(Object.keys(OPERATION_LOG_ACTIONS).map(labelKeyFor))
    const stale = Object.keys(labels).filter(key => !registered.has(key))
    expect(stale).toEqual([])
  })

  it('does not give login actions operation-log labels', () => {
    // 登录日志页面按 detail.method 渲染登录方式，不走 actionLabels。
    // 给登录动作加标签只会制造永不被读取的死翻译。
    for (const locale of LOCALES) {
      const labels = readActionLabels(locale)
      const loginLabels = Object.keys(LOGIN_LOG_ACTIONS).filter(action => labelKeyFor(action) in labels)
      expect(loginLabels).toEqual([])
    }
  })

  it('covers both surfaces in the unified registry', () => {
    // 写入内核只认 AUDIT_ACTIONS；两个展示面加起来必须等于它，否则会出现
    // 「能写入但没有任何页面能展示」或「注册了却不在写入类型里」的动作码。
    expect(Object.keys(AUDIT_ACTIONS).sort()).toEqual(
      [...Object.keys(OPERATION_LOG_ACTIONS), ...Object.keys(LOGIN_LOG_ACTIONS)].sort()
    )
  })

  it('keeps the two surfaces disjoint', () => {
    const operationKeys = new Set(Object.keys(OPERATION_LOG_ACTIONS))
    const overlap = Object.keys(LOGIN_LOG_ACTIONS).filter(action => operationKeys.has(action))
    expect(overlap).toEqual([])
  })

  it('namespaces every login action under the login prefix', () => {
    const misnamed = Object.keys(LOGIN_LOG_ACTIONS).filter(action => !action.startsWith(LOGIN_ACTION_PREFIX))
    expect(misnamed).toEqual([])
  })

  it('keeps login actions out of the operation-log surface so they stay on their own page', () => {
    const leaked = Object.keys(OPERATION_LOG_ACTIONS).filter(action => action.startsWith(LOGIN_ACTION_PREFIX))
    expect(leaked).toEqual([])
  })

  it('treats secret disclosure as a gate and credential changes as durable', () => {
    expect(resolveAuditCriticality('user.api-key.reveal')).toBe('gate')
    expect(resolveAuditCriticality('admin.redemption-code.reveal')).toBe('gate')
    expect(resolveAuditCriticality('user.password.change')).toBe('durable')
    expect(resolveAuditCriticality('user.password.reset')).toBe('durable')
    expect(resolveAuditCriticality('admin.operation-log.cleanup')).toBe('durable')
    expect(resolveAuditCriticality('user.profile.update')).toBe('standard')
  })

  it('treats every login event as durable', () => {
    // 登录成功是会话创建的唯一凭据，登录失败是识别撞库的唯一线索。
    for (const action of Object.keys(LOGIN_LOG_ACTIONS)) {
      expect(resolveAuditCriticality(action)).toBe('durable')
    }
  })

  it('falls back to standard for unknown actions so audit availability is never blocked', () => {
    expect(resolveAuditCriticality('totally.unknown.action')).toBe('standard')
  })

  it('derives i18n keys by flattening dots and dashes', () => {
    expect(auditActionMessageKey('admin.api-key.reset'))
      .toBe('admin.logs.operations.actionLabels.admin_api_key_reset')
  })
})
