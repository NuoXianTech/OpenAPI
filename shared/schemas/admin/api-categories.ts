import { z } from 'zod'

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
