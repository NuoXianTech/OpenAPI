import { z } from 'zod'
import { emailSchema, usernameSchema } from '#shared/schemas/validation'

export const adminInitialProfileSchema = z.object({
  username: usernameSchema,
  email: emailSchema
})
