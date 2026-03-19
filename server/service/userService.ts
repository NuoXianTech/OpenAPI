import { eq } from 'drizzle-orm'
import { users } from '@nuxthub/db/schema'

export const usersService = {
  async list() {
    return await db.select().from(users)
  },

  async findByEmail(email: string) {
    const res = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return res[0]
  },

  async findByUsername(username: string) {
    const res = await db.select().from(users).where(eq(users.username, username)).limit(1)
    return res[0]
  },

  async getById(id: number) {
    const res = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return res[0]
  },

  async addUser(data: {
    username: string
    email: string
    passwordHash: string
    displayName?: string
    isActive?: boolean
    lastLoginIp?: string
  }) {
    const res = await db
      .insert(users)
      .values({
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName || data.username,
        role: 'user',
        isActive: data.isActive ?? false,
        isBanned: false,
        lastLoginIp: data.lastLoginIp || '0.0.0.0',
      })
      .returning()

    return res[0]
  },

  async updateLastLogin(id: number, ip: string) {
    const res = await db.update(users)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      })
      .where(eq(users.id, id))
      .returning()

    return res[0]
  },

  async activateUser(id: number) {
    const res = await db.update(users)
      .set({
        isActive: true,
        emailVerifiedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()

    return res[0]
  },
}
