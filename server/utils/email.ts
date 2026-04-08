import { sendSmtpMail } from './smtp'
import { siteSettingsService } from '~~/server/service/siteSettingsService'

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const settings = await siteSettingsService.getOrCreate()
  const subject = '请验证您的邮箱'
  const html = `
    <div style="font-family:Arial, sans-serif; line-height:1.6; color:#111113;">
      <h2 style="margin:0 0 12px;">邮箱验证</h2>
      <p>感谢注册 ${settings.siteName}，请点击下面的按钮完成邮箱验证：</p>
      <p style="margin:16px 0;">
        <a href="${verifyUrl}" style="background:#111113;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block;">立即验证</a>
      </p>
      <p>如果按钮无法点击，请复制以下链接到浏览器打开：</p>
      <p style="word-break:break-all;">${verifyUrl}</p>
      <p style="color:#666872;font-size:12px;">该链接有时效，请尽快完成验证。</p>
    </div>
  `

  await sendSmtpMail({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    user: settings.smtpUser,
    pass: settings.smtpPass,
    from: settings.smtpFrom,
  }, {
    to,
    subject,
    html,
  })
}
