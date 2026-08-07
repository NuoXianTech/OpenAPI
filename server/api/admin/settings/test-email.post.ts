import { createError } from 'h3'
import { adminTestSmtpSchema } from '~~/server/schemas/admin'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { sendTestEmail } from '~~/server/utils/email'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { to } = await readZodBody(event, adminTestSmtpSchema)

  try {
    await sendTestEmail(to, admin.username)
  } catch (error) {
    const message = (error as Error)?.message || '发信失败'
    await addRequestOperationLog(event, {
      userId: admin.id,
      actor: admin.username,
      action: 'admin.settings.smtp.test',
      resourceType: 'site-settings',
      detail: { to, error: message },
      status: 'failure'
    })
    throw createError({ statusCode: 500, message: `SMTP 发送失败：${message}` })
  }

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.settings.smtp.test',
    resourceType: 'site-settings',
    detail: { to }
  })

  return { ok: true }
})
