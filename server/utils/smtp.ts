import nodemailer from 'nodemailer'

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

export interface SendMailInput {
  to: string
  subject: string
  html: string
}

export async function sendSmtpMail(config: SmtpConfig, input: SendMailInput) {
  // EHLO 用 from 邮箱的域名，避免写死 localhost 被 Gmail / O365 拒收
  const ehloName = config.from.split('@')[1] || undefined

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // secure=true → 465 隐式 TLS；secure=false → 25/587，nodemailer 默认在服务器支持时机会式升级到 STARTTLS
    secure: config.secure,
    auth: config.user && config.pass
      ? { user: config.user, pass: config.pass }
      : undefined,
    name: ehloName,
  })

  try {
    await transport.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    })
  }
  finally {
    transport.close()
  }
}
