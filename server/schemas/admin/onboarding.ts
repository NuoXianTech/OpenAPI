import { z } from 'zod'
import { emailSchema, passwordSchema, usernameSchema } from '#shared/schemas/validation'

export const adminInitialProfileSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema
}).strict()
