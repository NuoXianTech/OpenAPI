import { z } from 'zod'
import { isCidr } from '../utils/cidr'
import { optionalDate } from './common'

// ============================================================
// User · Profile
// ============================================================

/** 用户更新自己的非敏感资料：displayName */
export const userUpdateProfileSchema = z.object({
  displayName: z.string().trim().max(32, '显示名最多 32 字')
})

/** 已登录用户改密码 */
export const userChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '当前密码和新密码均必填'),
    newPassword: z.string().min(8, '新密码至少 8 位')
  })
  .refine(d => d.newPassword !== d.currentPassword, {
    message: '新密码与当前密码相同',
    path: ['newPassword']
  })

/** 已登录用户申请变更邮箱 */
export const userRequestEmailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().pipe(z.email('Invalid new email address'))
})

// ============================================================
// User · API Keys
// ============================================================

/** 接口范围 scope 字符串：`v1.user` / `user` / `*` 形态 */
const scopeSchema = z.string()
  .trim()
  .min(1, '接口标识不能为空')
  .max(80, '接口标识过长')
  .regex(/^[a-zA-Z0-9_.\-*]+$/, '接口标识仅允许字母数字 _ - . *')

/** 单条 CIDR */
const cidrSchema = z.string()
  .trim()
  .min(1, 'CIDR 不能为空')
  .max(64, 'CIDR 过长')
  .refine(isCidr, { message: '必须为 CIDR 格式（例：1.2.3.4/32 或 10.0.0.0/8）' })

/** 把 jsonb 风格的"空数组当 null"统一规范化 */
const nullableStringArray = <T extends z.ZodTypeAny>(item: T, max: number) => z.preprocess(
  (v) => {
    if (v === undefined) return undefined
    if (v === null) return null
    if (Array.isArray(v) && v.length === 0) return null
    return v
  },
  z.union([z.array(item).max(max), z.null()]).optional()
)

/** 用户给自己加 apikey，新增过期时间 / 额度 / 接口范围 / IP CIDR 白名单 / 批量数量 */
export const userCreateApiKeySchema = z.object({
  name: z.string().trim().max(80, '名称最多 80 字').optional(),
  /** 过期时刻；null/省略 = 永不过期 */
  expiresAt: optionalDate,
  /** Key 累计可消耗积分上限；null = 无限配额 */
  totalQuota: z.preprocess(
    (v) => {
      if (v === undefined) return undefined
      if (v === null || v === '') return null
      return v
    },
    z.union([z.null(), z.coerce.number().int().min(0, '积分上限不能为负')]).optional()
  ),
  /** 接口范围；null / [] = 全部 */
  scopes: nullableStringArray(scopeSchema, 200),
  /** IP CIDR 白名单；null / [] = 全部 */
  ipWhitelist: nullableStringArray(cidrSchema, 200),
  /** 批量生成数量 · 1-5；首个用 name 原值，后续追加随机后缀 */
  count: z.coerce.number().int().min(1, '至少 1 个').max(5, '最多 5 个').default(1)
})
export type UserCreateApiKeyInput = z.output<typeof userCreateApiKeySchema>

/**
 * 用户更新自己的 API Key 配置 · 仅允许改 name / expiresAt / totalQuota / scopes / ipWhitelist / isActive。
 * apiKey 字符串本身、归属用户、计费状态等不可改；要换 key 走 reset。
 *
 * 所有可选字段：未传 = 不修改；传 null = 清空（无限/全部/永不过期）。
 */
export const userUpdateApiKeySchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  name: z.string().trim().max(80, '名称最多 80 字').optional(),
  expiresAt: optionalDate,
  totalQuota: z.preprocess(
    (v) => {
      if (v === undefined) return undefined
      if (v === null || v === '') return null
      return v
    },
    z.union([z.null(), z.coerce.number().int().min(0, '积分上限不能为负')]).optional()
  ),
  scopes: nullableStringArray(scopeSchema, 200),
  ipWhitelist: nullableStringArray(cidrSchema, 200),
  isActive: z.boolean().optional()
}).refine(
  d => d.name !== undefined
    || d.expiresAt !== undefined
    || d.totalQuota !== undefined
    || d.scopes !== undefined
    || d.ipWhitelist !== undefined
    || d.isActive !== undefined,
  { message: '至少需要修改一个字段', path: [] }
)
export type UserUpdateApiKeyInput = z.output<typeof userUpdateApiKeySchema>

// ============================================================
// User · Credits
// ============================================================

/** 用户兑换码兑换 */
export const userRedeemCodeSchema = z.object({
  code: z.string().trim().min(1, '请输入兑换码')
})
