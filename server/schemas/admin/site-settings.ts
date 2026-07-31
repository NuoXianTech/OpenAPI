import { z } from 'zod'
import {
  OAUTH_SYSTEM_SETTING_NAMES,
  SYSTEM_SETTING_NAMES,
  createSystemSettingsPatchShape,
  type SystemSettingName
} from '~~/server/config/system-settings'
import { atLeastOneFieldMessage, emailSchema } from '../validation'

const oauthSettingNames = new Set<SystemSettingName>(OAUTH_SYSTEM_SETTING_NAMES)
const generalSettingNames = SYSTEM_SETTING_NAMES.filter(name => !oauthSettingNames.has(name))

export const adminUpdateSiteSettingsSchema = z.object(
  createSystemSettingsPatchShape(generalSettingNames)
).strict().refine(
  data => Object.values(data).some(value => value !== undefined),
  { message: atLeastOneFieldMessage(), path: [] }
).refine(
  data => data.checkinMode !== 'range'
    || data.checkinAmountMin === undefined
    || data.checkinAmountMax === undefined
    || data.checkinAmountMin <= data.checkinAmountMax,
  { message: '最少签到积分不能大于最多签到积分', path: ['checkinAmountMin'] }
)

export const adminTestSmtpSchema = z.object({
  to: emailSchema
})
