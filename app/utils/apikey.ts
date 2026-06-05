/**
 * API Key 管理的纯函数集合（user 页面与 admin 弹窗共用）。
 *
 * 全部无副作用、不依赖组件上下文：过期时间在「datetime-local 字符串 / ISO / 预设」
 * 之间互转、CIDR 行解析与校验、列表展示文案（遮罩 / 配额 / 范围 / IP / 状态）。
 * 与 utils/datetime.ts 同为顶层 util，使用处无需显式 import。
 */
import { isCidr } from '#shared/utils/cidr'
import type { ApiKeyItem, ExpiryPreset } from '~/composables/api/types'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const MONTH_MS = 30 * DAY_MS

/** Date → datetime-local 输入需要的本地时间串（YYYY-MM-DDTHH:mm） */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 自定义过期的默认初值：当前 + 7 天 */
export function defaultCustomExpiry(): string {
  return toDatetimeLocal(new Date(Date.now() + 7 * DAY_MS))
}

/**
 * ISO / null → 表单的 { preset, custom }。
 * 已签发的 Key 不便回推到 1h/1d/1mo，统一落到 custom 并把初值填成其本地时间。
 */
export function expiryToFormInput(expiresAt: string | null): { preset: ExpiryPreset, custom: string } {
  if (!expiresAt) return { preset: 'never', custom: defaultCustomExpiry() }
  const d = new Date(expiresAt)
  if (Number.isNaN(d.getTime())) return { preset: 'never', custom: defaultCustomExpiry() }
  return { preset: 'custom', custom: toDatetimeLocal(d) }
}

/** 表单 { preset, custom } → 提交用 ISO 串 | null */
export function expiryToIso(preset: ExpiryPreset, custom: string): string | null {
  switch (preset) {
    case 'never': return null
    case '1h': return new Date(Date.now() + HOUR_MS).toISOString()
    case '1d': return new Date(Date.now() + DAY_MS).toISOString()
    case '1mo': return new Date(Date.now() + MONTH_MS).toISOString()
    case 'custom': {
      if (!custom) return null
      const d = new Date(custom)
      return Number.isNaN(d.getTime()) ? null : d.toISOString()
    }
  }
}

/** 把多行 / 逗号分隔文本拆成 trim 后的非空条目 */
export function parseCidrLines(text: string): string[] {
  return text.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
}

/** 返回格式非法的行（1-based 行号），供表单逐行报错 */
export function findCidrLineErrors(text: string): Array<{ index: number, value: string }> {
  if (!text.trim()) return []
  const errs: Array<{ index: number, value: string }> = []
  parseCidrLines(text).forEach((line, i) => {
    if (!isCidr(line)) errs.push({ index: i + 1, value: line })
  })
  return errs
}

/** 列表遮罩：保留首 8 位与末 4 位，中间打码 */
export function maskApiKey(key: string): string {
  if (!key || key.length <= 12) return key
  return `${key.slice(0, 8)}${'•'.repeat(8)}${key.slice(-4)}`
}

export function isApiKeyExpired(row: Pick<ApiKeyItem, 'expiresAt'>): boolean {
  return row.expiresAt ? new Date(row.expiresAt).getTime() <= Date.now() : false
}

/** 配额展示：null = 无限,否则 “已用 / 总额” */
export function apiKeyQuotaText(row: Pick<ApiKeyItem, 'totalQuota' | 'usedCredits'>): string {
  if (row.totalQuota === null || row.totalQuota === undefined) return '无限'
  const used = Number(row.usedCredits || 0)
  return `${used.toLocaleString()} / ${Number(row.totalQuota).toLocaleString()}`
}

/**
 * 接口范围摘要：空 = 全部接口；≤2 个时尽量展示接口名（需 labelMap），否则 “N 个接口”。
 */
export function apiKeyScopesText(scopes: string[] | null, labelMap?: Map<string, string>): string {
  if (!scopes || scopes.length === 0) return '全部接口'
  if (scopes.length <= 2) return scopes.map(s => labelMap?.get(s) || s).join(', ')
  return `${scopes.length} 个接口`
}

/** IP 白名单摘要：空 = 全部 IP；1 条直接展示；多条 “N 条 CIDR” */
export function apiKeyIpText(ipWhitelist: string[] | null): string {
  if (!ipWhitelist || ipWhitelist.length === 0) return '全部 IP'
  if (ipWhitelist.length <= 1) return ipWhitelist[0] ?? '全部 IP'
  return `${ipWhitelist.length} 条 CIDR`
}

/** 行状态徽章：撤销 > 停用 > 过期 > 启用 */
export function apiKeyStatus(row: ApiKeyItem): { label: string, color: 'success' | 'warning' | 'neutral' | 'error' } {
  if (row.revokedAt) return { label: '已撤销', color: 'error' }
  if (!row.isActive) return { label: '停用', color: 'neutral' }
  if (isApiKeyExpired(row)) return { label: '已过期', color: 'warning' }
  return { label: '启用', color: 'success' }
}
