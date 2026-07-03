import { z } from 'zod'
import { emailSchema } from '../common'

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
  icpBeian: z.string().trim().max(100, 'icpBeian is too long').optional(),
  policeBeian: z.string().trim().max(100, 'policeBeian is too long').optional(),
  termsUrl: z.string().trim().max(1000, 'termsUrl is too long').optional(),
  privacyUrl: z.string().trim().max(1000, 'privacyUrl is too long').optional(),
  sessionMaxAgeSeconds: z.coerce.number().int().positive('sessionMaxAgeSeconds must be a positive number').optional(),
  sessionAbsoluteMaxAgeSeconds: z.coerce.number().int().positive('sessionAbsoluteMaxAgeSeconds must be a positive number').optional(),
  sessionRememberMaxAgeSeconds: z.coerce.number().int().positive('sessionRememberMaxAgeSeconds must be a positive number').optional(),
  registrationMode: z.enum(['open', 'invite', 'closed'], 'registrationMode must be open / invite / closed').optional(),
  registerEmailFilterMode: emailFilterMode,
  registerEmailFilterList: z.string().max(5000).optional(),
  defaultRegisterCredits: z.coerce.number().int().min(0, 'defaultRegisterCredits must be >= 0').optional(),
  emailVerifyExpiresInMinutes: z.coerce.number().int().positive('emailVerifyExpiresInMinutes must be a positive number').optional(),
  emailActivationEnabled: z.boolean().optional(),
  passwordResetExpiresInMinutes: z.coerce.number().int().positive('passwordResetExpiresInMinutes must be a positive number').optional(),
  passwordResetEnabled: z.boolean().optional(),
  smtpHost: z.string().trim().min(1, 'smtpHost cannot be empty').max(255, 'smtpHost is too long').optional(),
  smtpPort: z.coerce.number().int().min(1, 'smtpPort must be between 1 and 65535').max(65535, 'smtpPort must be between 1 and 65535').optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().trim().optional(),
  smtpPass: z.string().optional(),
  smtpFrom: z.string().trim().min(1, 'smtpFrom cannot be empty').max(255, 'smtpFrom is too long').optional(),
  smtpFromName: z.string().trim().max(255, 'smtpFromName is too long').optional(),
  smtpReplyTo: z.string().trim().max(255, 'smtpReplyTo is too long').optional(),
  smtpPoolMaxAgeSeconds: z.coerce.number().int().min(0, 'smtpPoolMaxAgeSeconds must be >= 0').max(86400, 'smtpPoolMaxAgeSeconds is too large').optional(),
  oauthForceBinding: z.boolean().optional(),
  turnstileSiteKey: z.string().max(200, 'turnstileSiteKey is too long').optional(),
  turnstileSecretKey: z.string().max(200, 'turnstileSecretKey is too long').optional(),
  turnstileLoginEnabled: z.boolean().optional(),
  turnstileRegisterEnabled: z.boolean().optional(),
  turnstileAdminLoginEnabled: z.boolean().optional(),
  turnstilePasswordResetEnabled: z.boolean().optional(),
  turnstileCheckinEnabled: z.boolean().optional(),
  checkinEnabled: z.boolean().optional(),
  checkinCooldownMode: z.enum(['hours', 'fixed_time'], 'checkinCooldownMode must be hours / fixed_time').optional(),
  checkinRefreshHours: z.coerce.number().int().min(1, 'checkinRefreshHours must be >= 1').max(24 * 30, 'checkinRefreshHours is too large').optional(),
  checkinFixedRefreshTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'checkinFixedRefreshTime must be HH:mm').optional(),
  checkinMode: z.enum(['fixed', 'range'], 'checkinMode must be fixed / range').optional(),
  checkinAmountFixed: z.coerce.number().int().min(0, 'checkinAmountFixed must be >= 0').optional(),
  checkinAmountMin: z.coerce.number().int().min(0, 'checkinAmountMin must be >= 0').optional(),
  checkinAmountMax: z.coerce.number().int().min(0, 'checkinAmountMax must be >= 0').optional()
}).refine(
  d => Object.values(d).some(v => v !== undefined),
  { message: 'at least one field is required', path: [] }
).refine(
  d => d.checkinMode !== 'range' || d.checkinAmountMin === undefined || d.checkinAmountMax === undefined || d.checkinAmountMin <= d.checkinAmountMax,
  { message: 'checkinAmountMin must be <= checkinAmountMax', path: ['checkinAmountMin'] }
)

export const adminTestSmtpSchema = z.object({
  to: emailSchema
})
