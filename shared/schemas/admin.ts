import { z } from 'zod'
import { isCidr } from '../utils/cidr'
import { optionalDate } from './common'

// ============================================================
// Admin · Auth
// ============================================================

/** 管理员登录 */
export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, '请输入管理员账号'),
  password: z.string().min(1, '请输入管理员密码'),
  remember: z.boolean().optional(),
  turnstileToken: z.string().optional()
})
export type AdminLoginInput = z.output<typeof adminLoginSchema>

// ============================================================
// Admin · Users
// ============================================================

/** 封禁/解封用户 */
export const adminBanUserSchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  isBanned: z.boolean()
})

/** 管理员-直接创建用户（跳过邮箱验证流程） */
export const adminCreateUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, '用户名至少 3 位')
    .max(32, '用户名最多 32 位')
    .regex(/^[a-zA-Z0-9_-]+$/, '只能包含字母、数字、下划线和短横线'),
  email: z.string().trim().toLowerCase().pipe(z.email('请输入有效的邮箱地址')),
  password: z.string().min(8, '密码至少 8 位'),
  displayName: z.string().trim().max(32, '显示名最多 32 字').optional(),
  isActive: z.boolean().optional()
})

/** 更新用户信息（部分字段） */
export const adminUpdateUserSchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  username: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().optional(),
  displayName: z.string().trim().max(32, '显示名最多 32 字').optional(),
  isActive: z.boolean().optional(),
  isBanned: z.boolean().optional()
})

// ============================================================
// Admin · User · API Keys
// ============================================================

const apiKeyScopeSchema = z.string()
  .trim()
  .min(1, '接口标识不能为空')
  .max(80, '接口标识过长')
  .regex(/^[a-zA-Z0-9_.\-*]+$/, '接口标识仅允许字母数字 _ - . *')

const apiKeyCidrSchema = z.string()
  .trim()
  .min(1, 'CIDR 不能为空')
  .max(64, 'CIDR 过长')
  .refine(isCidr, { message: '必须为 CIDR 格式（例：1.2.3.4/32 或 10.0.0.0/8）' })

const apiKeyNullableArray = <T extends z.ZodTypeAny>(item: T, max: number) => z.preprocess(
  (v) => {
    if (v === undefined) return undefined
    if (v === null) return null
    if (Array.isArray(v) && v.length === 0) return null
    return v
  },
  z.union([z.array(item).max(max), z.null()]).optional()
)

/** 管理员-给指定用户加 apikey */
export const adminCreateUserApiKeySchema = z.object({
  userId: z.coerce.number().int().positive('userId is required'),
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
  scopes: apiKeyNullableArray(apiKeyScopeSchema, 200),
  ipWhitelist: apiKeyNullableArray(apiKeyCidrSchema, 200),
  count: z.coerce.number().int().min(1, '至少 1 个').max(5, '最多 5 个').default(1)
})
export type AdminCreateUserApiKeyInput = z.output<typeof adminCreateUserApiKeySchema>

/** 管理员-编辑某个 API Key 的配置（id 唯一定位；不绑定 userId） */
export const adminUpdateUserApiKeySchema = z.object({
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
  scopes: apiKeyNullableArray(apiKeyScopeSchema, 200),
  ipWhitelist: apiKeyNullableArray(apiKeyCidrSchema, 200),
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
export type AdminUpdateUserApiKeyInput = z.output<typeof adminUpdateUserApiKeySchema>

// ============================================================
// Admin · User · Credits
// ============================================================

/** 管理员-用户积分批量调整（grant/revoke/reset） */
export const adminAdjustCreditsSchema = z.object({
  userIds: z.array(z.coerce.number().int().positive()).default([]),
  operation: z.enum(['grant', 'revoke', 'reset'], 'operation 只能是 grant / revoke / reset'),
  amount: z.coerce.number().int().min(0).default(0),
  remark: z.string().trim().max(500).optional()
})

// ============================================================
// Admin · API Categories
// ============================================================

export const adminCreateApiCategorySchema = z.object({
  code: z.string().trim().min(1, 'code and name are required'),
  name: z.string().trim().min(1, 'code and name are required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isEnabled: z.boolean().optional()
})

export const adminUpdateApiCategorySchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  name: z.string().trim().optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isEnabled: z.boolean().optional()
})

// ============================================================
// Admin · APIs
// ============================================================

/** methodCosts：按 HTTP 方法粒度的扣费表（key=大写方法名，value=积分>=0）。空对象/缺失=整组免费。 */
const methodCostsSchema = z.preprocess(
  (v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return v
    const out: Record<string, number> = {}
    for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
      const num = Number(raw)
      if (Number.isFinite(num) && num >= 0) out[k.toUpperCase()] = Math.trunc(num)
    }
    return out
  },
  z.record(z.string(), z.number().int().min(0))
)

/** 从 manifest 登记 / 重新同步一个 (pathVersion, code) */
export const adminRegisterApiSchema = z.object({
  pathVersion: z.string().trim().min(1, 'pathVersion 和 code 均必填'),
  code: z.string().trim().min(1, 'pathVersion 和 code 均必填'),
  overrides: z.object({
    name: z.string().optional(),
    shortDesc: z.string().optional(),
    description: z.string().optional(),
    docUrl: z.string().optional(),
    status: z.number().optional(),
    categoryId: z.number().nullable().optional(),
    isEnabled: z.boolean().optional(),
    isApiKey: z.boolean().optional(),
    isStatistics: z.boolean().optional(),
    rateLimitPerSecond: z.number().optional(),
    rateLimitPerMinute: z.number().optional(),
    rateLimitPerHour: z.number().optional(),
    rateLimitPerDay: z.number().optional(),
    dailyQuota: z.number().optional(),
    methodCosts: methodCostsSchema.optional(),
    timeoutMs: z.number().optional()
  }).optional()
})

/** 编辑已登记 API 的治理字段 */
export const adminUpdateApiSchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  name: z.string().trim().optional(),
  status: z.coerce.number().optional(),
  // 兼容 '' / null / number：上游把空值视为 null（清空分类）
  categoryId: z.preprocess(
    v => (v === '' || v === null ? null : v),
    z.union([z.coerce.number().int().positive(), z.null()]).optional()
  ),
  shortDesc: z.string().trim().optional(),
  description: z.string().trim().optional(),
  docUrl: z.string().trim().optional(),
  isEnabled: z.boolean().optional(),
  isApiKey: z.boolean().optional(),
  isStatistics: z.boolean().optional(),
  rateLimitPerSecond: z.coerce.number().optional(),
  rateLimitPerMinute: z.coerce.number().optional(),
  rateLimitPerHour: z.coerce.number().optional(),
  rateLimitPerDay: z.coerce.number().optional(),
  dailyQuota: z.coerce.number().optional(),
  methodCosts: methodCostsSchema.optional(),
  timeoutMs: z.coerce.number().optional()
})

/** 切换 API 字段开关 */
export const adminToggleApiSchema = z.object({
  id: z.coerce.number().int().positive('invalid parameters'),
  field: z.enum(['isEnabled', 'isStatistics'], 'invalid parameters'),
  value: z.boolean()
})

// ============================================================
// Admin · Announcements
// ============================================================

const announcementLevel = z.enum(['info', 'success', 'warning', 'critical'])

export const adminCreateAnnouncementSchema = z.object({
  title: z.string().trim().min(1, 'title and content are required'),
  content: z.string().min(1, 'title and content are required'),
  level: announcementLevel.catch('info').optional(),
  isPinned: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  startAt: optionalDate,
  endAt: optionalDate,
  linkUrl: z.string().optional(),
  sortOrder: z.coerce.number().int().optional()
})

export const adminUpdateAnnouncementSchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  title: z.string().trim().optional(),
  content: z.string().optional(),
  level: announcementLevel.catch('info').optional(),
  isPinned: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  startAt: optionalDate,
  endAt: optionalDate,
  linkUrl: z.string().optional(),
  sortOrder: z.coerce.number().int().optional()
})

// ============================================================
// Admin · Friend Links
// ============================================================

export const adminCreateFriendLinkSchema = z.object({
  title: z.string().trim().min(1, 'title and url are required'),
  url: z.string().trim().min(1, 'title and url are required'),
  description: z.string().optional(),
  isActive: z.boolean().optional()
})

export const adminUpdateFriendLinkSchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  title: z.string().trim().optional(),
  url: z.string().trim().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
})

// ============================================================
// Admin · OAuth Providers
// ============================================================

export const adminUpdateOauthProviderSchema = z.object({
  provider: z.string().trim().toLowerCase().min(1, 'provider 不合法，仅支持 github / qq'),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  isEnabled: z.boolean().optional()
})

// ============================================================
// Admin · Notifications
// ============================================================

const notificationLevel = z.enum(['info', 'success', 'warning', 'critical'])
const notificationAudience = z.enum(['specific', 'all_current', 'all_with_future'])

export const adminSendNotificationSchema = z.object({
  audience: notificationAudience.catch('specific').optional(),
  recipientUserIds: z.array(z.coerce.number().int().positive()).optional(),
  title: z.string().trim().min(1, 'title 与 content 必填').max(200, 'title 过长（最多 200 字）'),
  content: z.string().min(1, 'title 与 content 必填'),
  level: notificationLevel.catch('info').optional(),
  linkUrl: z.string().nullable().optional()
})

// ============================================================
// Admin · Redemption Codes
// ============================================================

export const adminGenerateRedemptionCodeSchema = z.object({
  amount: z.coerce.number().int().positive('amount 必须 > 0'),
  count: z.coerce.number().int().min(1).max(1000).optional(),
  prefix: z.string().nullable().optional(),
  length: z.coerce.number().int().min(8).max(48).optional(),
  maxUses: z.coerce.number().int().min(1).optional(),
  expiresAt: z.string().nullable().optional(),
  note: z.string().nullable().optional()
})

export const adminToggleRedemptionCodeSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  batchId: z.string().trim().optional(),
  enabled: z.boolean().optional()
}).refine(d => Boolean(d.id) || Boolean(d.batchId), {
  message: 'id 或 batchId 必填一个',
  path: ['id']
})

export const adminDeleteRedemptionCodeSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  batchId: z.string().trim().optional(),
  includeUsed: z.boolean().optional()
}).refine(d => Boolean(d.id) || Boolean(d.batchId), {
  message: 'id 或 batchId 必填一个',
  path: ['id']
})

// ============================================================
// Admin · Site Settings
// ============================================================

const emailFilterMode = z.preprocess(
  v => (v === '' || v === null ? undefined : v),
  z.enum(['off', 'whitelist', 'blacklist'], 'registerEmailFilterMode must be off / whitelist / blacklist').optional()
)

export const adminUpdateSiteSettingsSchema = z.object({
  siteUrl: z
    .string()
    .trim()
    .min(1, 'siteUrl cannot be empty')
    .max(1000, 'siteUrl is too long')
    .regex(/^https?:\/\//, 'siteUrl must start with http:// or https://')
    .optional(),
  siteImg: z.string().trim().min(1, 'siteImg cannot be empty').max(1000, 'siteImg is too long').optional(),
  siteName: z.string().trim().min(1, 'siteName cannot be empty').max(140, 'siteName is too long').optional(),
  siteDescription: z.string().trim().min(1, 'siteDescription cannot be empty').max(5000, 'siteDescription is too long').optional(),
  startTime: z.string().trim().min(1, 'startTime cannot be empty').max(32, 'startTime is too long').optional(),
  sessionMaxAgeSeconds: z.coerce.number().int().positive('sessionMaxAgeSeconds must be a positive number').optional(),
  sessionAbsoluteMaxAgeSeconds: z.coerce.number().int().positive('sessionAbsoluteMaxAgeSeconds must be a positive number').optional(),
  sessionRememberMaxAgeSeconds: z.coerce.number().int().positive('sessionRememberMaxAgeSeconds must be a positive number').optional(),
  registerEmailFilterMode: emailFilterMode,
  registerEmailFilterList: z.string().max(5000).optional(),
  emailVerifyExpiresInMinutes: z.coerce.number().int().positive('emailVerifyExpiresInMinutes must be a positive number').optional(),
  passwordResetExpiresInMinutes: z.coerce.number().int().positive('passwordResetExpiresInMinutes must be a positive number').optional(),
  passwordResetEnabled: z.boolean().optional(),
  smtpHost: z.string().trim().min(1, 'smtpHost cannot be empty').max(255, 'smtpHost is too long').optional(),
  smtpPort: z.coerce.number().int().min(1, 'smtpPort must be between 1 and 65535').max(65535, 'smtpPort must be between 1 and 65535').optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().trim().optional(),
  smtpPass: z.string().optional(),
  smtpFrom: z.string().trim().min(1, 'smtpFrom cannot be empty').max(255, 'smtpFrom is too long').optional(),
  oauthLoginEnabled: z.boolean().optional(),
  oauthForceBinding: z.boolean().optional(),
  turnstileEnabled: z.boolean().optional(),
  turnstileSiteKey: z.string().max(200, 'turnstileSiteKey is too long').optional(),
  turnstileSecretKey: z.string().max(1000, 'turnstileSecretKey is too long').optional(),
  turnstileLoginEnabled: z.boolean().optional(),
  turnstileRegisterEnabled: z.boolean().optional(),
  turnstileAdminLoginEnabled: z.boolean().optional(),
  turnstilePasswordResetEnabled: z.boolean().optional(),
  announcementShowOnHome: z.boolean().optional()
}).refine(
  d => Object.values(d).some(v => v !== undefined),
  { message: 'at least one field is required', path: [] }
)

/** 测试发信：仅需收件邮箱，使用后台已保存的 SMTP 配置 */
export const adminTestSmtpSchema = z.object({
  to: z.string().trim().toLowerCase().pipe(z.email('请输入有效的邮箱地址'))
})
