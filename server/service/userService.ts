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

  async updateUser(id: number, data: Partial<{
    username: string
    email: string
    displayName: string | null
    avatarUrl: string | null
    isActive: boolean
    isBanned: boolean
    passwordHash: string
  }>) {
    const res = await db.update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()

    return res[0] || null
  },

  async deleteUser(id: number) {
    const res = await db.delete(users).where(eq(users.id, id)).returning()
    return res[0] || null
  },

  async addUser(data: {
    username: string
    email: string
    passwordHash: string
    displayName?: string
    isActive?: boolean
  }) {
    const res = await db
      .insert(users)
      .values({
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName || data.username,
        isActive: data.isActive ?? false,
        isBanned: false,
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

  async banUser(id: number, isBanned: boolean) {
    const res = await db.update(users)
      .set({
        isBanned,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()

    return res[0] || null
  },
}
