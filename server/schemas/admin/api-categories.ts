import { z } from 'zod'
import { positiveInt, requiredString } from '../../../shared/schemas/validation'

export const adminCreateApiCategorySchema = z.object({
  code: requiredString('分类标识'),
  name: requiredString('分类名称'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isEnabled: z.boolean().optional()
})

export const adminUpdateApiCategorySchema = z.object({
  id: positiveInt('分类 ID'),
  name: z.string().trim().optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isEnabled: z.boolean().optional()
})
