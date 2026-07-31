import { sendSmtpMail } from './smtp'
import { systemSettingsService } from '~~/server/services/system-settings-service'

async function getSmtpConfig() {
  const settings = await systemSettingsService.getSettings()
  return {
    smtp: {
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      user: settings.smtpUser,
      pass: settings.smtpPass,
      from: settings.smtpFrom,
      fromName: settings.smtpFromName || undefined,
      replyTo: settings.smtpReplyTo || undefined,
      poolMaxAgeSeconds: settings.smtpPoolMaxAgeSeconds || 0
    },
    siteName: settings.siteName
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderActionEmail(params: {
  heading: string
  intro: string
  buttonLabel: string
  url: string
  footer?: string
}) {
  const safeUrl = escapeHtml(params.url)
  return `
    <div style="font-family:Arial, sans-serif; line-height:1.6; color:#111113;">
      <h2 style="margin:0 0 12px;">${params.heading}</h2>
      <p>${params.intro}</p>
      <p style="margin:16px 0;">
        <a href="${safeUrl}" style="background:#111113;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block;">${params.buttonLabel}</a>
      </p>
      <p>如果按钮无法点击，请复制以下链接到浏览器打开：</p>
      <p style="word-break:break-all;">${safeUrl}</p>
      ${params.footer ? `<p style="color:#666872;font-size:12px;">${params.footer}</p>` : ''}
    </div>
  `
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const { smtp, siteName } = await getSmtpConfig()
  const safeSiteName = escapeHtml(siteName)
  await sendSmtpMail(smtp, {
    to,
    subject: '请验证您的邮箱',
    html: renderActionEmail({
      heading: '邮箱验证',
      intro: `感谢注册 ${safeSiteName}，请点击下面的按钮完成邮箱验证：`,
      buttonLabel: '立即验证',
      url: verifyUrl,
      footer: '该链接有时效，请尽快完成验证。'
    })
  })
}

export async function sendDuplicateRegistrationEmail(to: string, loginUrl: string) {
  const { smtp, siteName } = await getSmtpConfig()
  const safeSiteName = escapeHtml(siteName)
  await sendSmtpMail(smtp, {
    to,
    subject: '您的邮箱已注册',
    html: renderActionEmail({
      heading: '账号已存在',
      intro: `检测到有人尝试用您的邮箱在 ${safeSiteName} 注册账号。如果是您本人，请立即登录；忘记密码可在登录页通过"找回密码"重置。`,
      buttonLabel: '前往登录',
      url: loginUrl,
      footer: '如果不是您本人操作，您可以忽略本邮件。'
    })
  })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const { smtp, siteName } = await getSmtpConfig()
  const safeSiteName = escapeHtml(siteName)
  await sendSmtpMail(smtp, {
    to,
    subject: '重置密码',
    html: renderActionEmail({
      heading: '重置密码',
      intro: `您在 ${safeSiteName} 申请了密码重置，点击下方按钮设置新密码：`,
      buttonLabel: '重置密码',
      url: resetUrl,
      footer: '如果您没有申请重置密码，请忽略本邮件。链接有时效，请尽快操作。'
    })
  })
}

export async function sendTestEmail(to: string, actor: string) {
  const { smtp, siteName } = await getSmtpConfig()
  const safeSiteName = escapeHtml(siteName)
  const safeActor = escapeHtml(actor)
  await sendSmtpMail(smtp, {
    to,
    subject: `[${siteName}] SMTP 测试邮件`,
    html: `
      <div style="font-family:Arial, sans-serif; line-height:1.6; color:#111113;">
        <h2 style="margin:0 0 12px;">SMTP 测试邮件</h2>
        <p>这是来自 ${safeSiteName} 后台 SMTP 配置测试发送的邮件。</p>
        <p>如果您收到此邮件，说明 SMTP 发信配置正常。</p>
        <p style="color:#666872;font-size:12px;">操作者：${safeActor}</p>
      </div>
    `
  })
}

export async function sendEmailChangeEmail(to: string, confirmUrl: string) {
  const { smtp, siteName } = await getSmtpConfig()
  const safeSiteName = escapeHtml(siteName)
  await sendSmtpMail(smtp, {
    to,
    subject: '确认邮箱变更',
    html: renderActionEmail({
      heading: '邮箱变更确认',
      intro: `您正在 ${safeSiteName} 修改账户邮箱到本邮箱，点击下方按钮完成确认：`,
      buttonLabel: '确认变更',
      url: confirmUrl,
      footer: '如果您没有申请邮箱变更，请忽略本邮件并建议尽快修改密码。链接有时效。'
    })
  })
}
