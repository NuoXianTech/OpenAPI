/**
 * API Key 管理的纯函数集合（user 页面与 admin 弹窗共用）。
 *
 * 全部无副作用、不依赖组件上下文：过期时间在「datetime-local 字符串 / ISO / 预设」
 * 之间互转、CIDR 行解析与校验，以及密钥字符串遮罩。
 * 与 utils/datetime.ts 同为顶层 util，使用处无需显式 import。
 */
import { isCidr } from '#shared/utils/cidr'
import type { ApiKeyItem, ExpiryPreset } from '#shared/types/api'

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
