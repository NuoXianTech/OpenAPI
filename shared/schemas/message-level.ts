import { z } from 'zod'

export const messageLevelSchema = z.enum(['info', 'success', 'warning', 'critical'])
