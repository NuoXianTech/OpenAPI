import { asc, desc, eq } from 'drizzle-orm'
import { fabMenuItems } from '@nuxthub/db/schema'

function normalizeActionType(actionType: unknown) {
  const value = (actionType || '').toString().trim().toLowerCase()
  return ['link', 'route', 'iframe'].includes(value) ? value : 'link'
}

function normalizeTarget(target: unknown) {
  const value = (target || '').toString().trim()
  return value || '_blank'
}

export const fabMenuService = {
  async list(activeOnly = false) {
    const query = db.select().from(fabMenuItems)
    const rows = activeOnly
      ? await query.where(eq(fabMenuItems.isActive, true)).orderBy(asc(fabMenuItems.sortOrder), desc(fabMenuItems.updatedAt))
      : await query.orderBy(asc(fabMenuItems.sortOrder), desc(fabMenuItems.updatedAt))

    return rows
  },

  async getById(id: number) {
    const res = await db.select().from(fabMenuItems).where(eq(fabMenuItems.id, id)).limit(1)
    return res[0] || null
  },

  async create(userid: number | null, data: Partial<typeof fabMenuItems.$inferInsert> & {
    title: string
    actionValue: string
  }) {
    const res = await db.insert(fabMenuItems).values({
      title: data.title,
      subtitle: data.subtitle ?? null,
      icon: data.icon?.toString().trim() || 'mdi:link-variant',
      actionType: normalizeActionType(data.actionType),
      actionValue: data.actionValue,
      actionLabel: data.actionLabel?.toString().trim() || '打开',
      target: normalizeTarget(data.target),
      sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : Number(data.sortOrder ?? 0),
      isActive: data.isActive ?? true,
      createdBy: userid,
      updatedBy: userid,
    }).returning()

    return res[0]
  },

  async update(id: number, userid: number | null, data: Partial<typeof fabMenuItems.$inferInsert>) {
    const res = await db.update(fabMenuItems)
      .set({
        ...data,
        subtitle: data.subtitle === '' ? null : data.subtitle ?? undefined,
        icon: data.icon?.toString().trim() || undefined,
        actionType: data.actionType ? normalizeActionType(data.actionType) : undefined,
        actionValue: data.actionValue?.toString().trim() || undefined,
        actionLabel: data.actionLabel?.toString().trim() || undefined,
        target: data.target ? normalizeTarget(data.target) : undefined,
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
        updatedBy: userid,
        updatedAt: new Date(),
      })
      .where(eq(fabMenuItems.id, id))
      .returning()

    return res[0] || null
  },

  async delete(id: number) {
    const res = await db.delete(fabMenuItems).where(eq(fabMenuItems.id, id)).returning()
    return res[0] || null
  },
}
