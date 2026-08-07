import { z } from 'zod'
import { optionalString, positiveInt, requiredString } from '../validation'

export const adminCreateApiCategorySchema = z.object({
  code: requiredString('分类标识', { max: 50 }),
  name: requiredString('分类名称', { max: 100 }),
  description: z.string().optional(),
  icon: optionalString('分类图标', { max: 120 }),
  color: optionalString('分类颜色', { max: 20 }),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isEnabled: z.boolean().optional()
})

export const adminUpdateApiCategorySchema = z.object({
  id: positiveInt('分类 ID'),
  name: requiredString('分类名称', { max: 100 }).optional(),
  description: z.string().nullable().optional(),
  icon: optionalString('分类图标', { max: 120 }).nullable(),
  color: optionalString('分类颜色', { max: 20 }).nullable(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isEnabled: z.boolean().optional()
})
