import { usersService } from '~~/server/service/userService'

export interface RollbackCreatedUserOptions {
  userId: number
  reason: string
  error: unknown
}

export async function rollbackCreatedUser(options: RollbackCreatedUserOptions): Promise<void> {
  const { userId, reason, error } = options
  console.error(`[registration] ${reason}, rolling back user`, { userId, error })
  try {
    await usersService.deleteUser(userId)
  } catch (rollbackError) {
    console.error('[registration] rollback failed', { userId, error: rollbackError })
  }
}
