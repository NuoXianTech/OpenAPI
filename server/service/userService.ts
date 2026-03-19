import { users } from '@nuxthub/db/schema'

export const usersService = {
  async list() {
    return await db.select().from(users)
  },

  async findByEmail(email: string) {
    const res = await db.select().from(users).where(users.email.equals(email)).limit(1)
    return res[0]
  },

  async findByUsername(username: string) {
    const res = await db.select().from(users).where(users.username.equals(username)).limit(1)
    return res[0]
  },

  async getById(id: number) {
    const res = await db.select().from(users).where(users.id.equals(id)).limit(1)
    return res[0]
  },

  async addUser(data: { username: string; email: string; passwordHash: string; displayName?: string }) {
    const res = await db
      .insert(users)
      .values({
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName || data.username,
        role: 'user',
        isActive: true,
        isBanned: false,
      })
      .returning()

    return res[0]
  },
}
