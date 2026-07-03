import { z } from 'zod'
import { emailSchema } from '../common'
import {
  atLeastOneFieldMessage,
  enumMessage,
  intRange,
  nonNegativeInt,
  optionalString,
  positiveInt,
  requiredHttpUrl,
  requiredString
} from '../validation'

const emailFilterMode = z.preprocess(
  v => (v === '' || v === null ? undefined : v),
  z.enum(['off', 'whitelist', 'blacklist'], enumMessage('邮箱过滤模式', ['off', 'whitelist', 'blacklist'])).optional()
)

export const adminUpdateSiteSettingsSchema = z.object({
  siteUrl: requiredHttpUrl('站点 URL').optional(),
  siteImg: requiredString('站点图标', { max: 1000 }).optional(),
  siteName: requiredString('站点名称', { max: 140 }).optional(),
  siteDescription: requiredString('站点描述', { max: 5000 }).optional(),
  startTime: requiredString('运行时间', { max: 32 }).optional(),
  icpBeian: optionalString('ICP 备案号', { max: 100 }),
  policeBeian: optionalString('公安备案号', { max: 100 }),
  termsUrl: optionalString('使用条款链接', { max: 1000 }),
  privacyUrl: optionalString('隐私政策链接', { max: 1000 }),
  sessionMaxAgeSeconds: positiveInt('会话新鲜期').optional(),
  sessionAbsoluteMaxAgeSeconds: positiveInt('会话绝对有效期').optional(),
  sessionRememberMaxAgeSeconds: positiveInt('记住登录有效期').optional(),
  registrationMode: z.enum(['open', 'invite', 'closed'], enumMessage('注册模式', ['open', 'invite', 'closed'])).optional(),
  registerEmailFilterMode: emailFilterMode,
  registerEmailFilterList: z.string().max(5000).optional(),
  defaultRegisterCredits: nonNegativeInt('默认注册积分').optional(),
  emailVerifyExpiresInMinutes: positiveInt('邮箱验证有效期').optional(),
  emailActivationEnabled: z.boolean().optional(),
  passwordResetExpiresInMinutes: positiveInt('密码重置有效期').optional(),
  passwordResetEnabled: z.boolean().optional(),
  smtpHost: requiredString('SMTP 主机', { max: 255 }).optional(),
  smtpPort: intRange('SMTP 端口', 1, 65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: optionalString('SMTP 用户名'),
  smtpPass: z.string().optional(),
  smtpFrom: requiredString('发件邮箱', { max: 255 }).optional(),
  smtpFromName: optionalString('发件人名称', { max: 255 }),
  smtpReplyTo: optionalString('回复邮箱', { max: 255 }),
  smtpPoolMaxAgeSeconds: intRange('SMTP 连接池存活时间', 0, 86400).optional(),
  oauthForceBinding: z.boolean().optional(),
  turnstileSiteKey: optionalString('Turnstile Site Key', { max: 200, trim: false }),
  turnstileSecretKey: optionalString('Turnstile Secret Key', { max: 200, trim: false }),
  turnstileLoginEnabled: z.boolean().optional(),
  turnstileRegisterEnabled: z.boolean().optional(),
  turnstileAdminLoginEnabled: z.boolean().optional(),
  turnstilePasswordResetEnabled: z.boolean().optional(),
  turnstileCheckinEnabled: z.boolean().optional(),
  checkinEnabled: z.boolean().optional(),
  checkinCooldownMode: z.enum(['hours', 'fixed_time'], enumMessage('签到冷却方式', ['hours', 'fixed_time'])).optional(),
  checkinRefreshHours: intRange('签到冷却间隔', 1, 24 * 30).optional(),
  checkinFixedRefreshTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, '签到刷新时间必须为 HH:mm').optional(),
  checkinMode: z.enum(['fixed', 'range'], enumMessage('签到奖励模式', ['fixed', 'range'])).optional(),
  checkinAmountFixed: nonNegativeInt('固定签到积分').optional(),
  checkinAmountMin: nonNegativeInt('最少签到积分').optional(),
  checkinAmountMax: nonNegativeInt('最多签到积分').optional()
}).refine(
  d => Object.values(d).some(v => v !== undefined),
  { message: atLeastOneFieldMessage(), path: [] }
).refine(
  d => d.checkinMode !== 'range' || d.checkinAmountMin === undefined || d.checkinAmountMax === undefined || d.checkinAmountMin <= d.checkinAmountMax,
  { message: '最少签到积分不能大于最多签到积分', path: ['checkinAmountMin'] }
)

export const adminTestSmtpSchema = z.object({
  to: emailSchema
})
