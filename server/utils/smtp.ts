import nodemailer, { type Transporter } from 'nodemailer'

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
  // 发件人昵称：非空时发信头形如 "昵称 <from>"
  fromName?: string
  // 回信地址（Reply-To）：留空则不设置
  replyTo?: string
  // 连接复用窗口（秒）：>0 时启用连接池并在该秒数后重建；0/缺省=每封新建即关闭
  poolMaxAgeSeconds?: number
}

interface SendMailInput {
  to: string
  subject: string
  html: string
}

// 连接复用：在 poolMaxAgeSeconds 窗口内，相同配置的发信请求复用同一个 pool 连接，
// 避免每封邮件都重新 TCP+TLS 握手。配置变化或过期时关闭旧连接并重建。
let cached: { key: string, transport: Transporter, expiresAt: number } | null = null

function transportKey(config: SmtpConfig) {
  return JSON.stringify([config.host, config.port, config.secure, config.user || '', config.pass || ''])
}

function buildTransport(config: SmtpConfig, pool: boolean): Transporter {
  // EHLO 用 from 邮箱的域名，避免写死 localhost 被 Gmail / O365 拒收
  const ehloName = config.from.split('@')[1] || undefined
  const base = {
    host: config.host,
    port: config.port,
    // secure=true → 465 隐式 TLS；secure=false → 25/587，nodemailer 默认在服务器支持时机会式升级到 STARTTLS
    secure: config.secure,
    auth: config.user && config.pass
      ? { user: config.user, pass: config.pass }
      : undefined,
    name: ehloName,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000
  }
  // pool 必须是字面量 true 才能命中 nodemailer 的连接池重载，故拆成两个分支
  return pool
    ? nodemailer.createTransport({ ...base, pool: true }) as Transporter
    : nodemailer.createTransport(base)
}

function acquireTransport(config: SmtpConfig): { transport: Transporter, reuse: boolean } {
  const ttl = Math.max(config.poolMaxAgeSeconds || 0, 0)
  if (ttl <= 0) {
    // 不复用：每封新建，发完即关
    return { transport: buildTransport(config, false), reuse: false }
  }

  const key = transportKey(config)
  const now = Date.now()
  if (cached && cached.key === key && cached.expiresAt > now) {
    return { transport: cached.transport, reuse: true }
  }

  if (cached) {
    try {
      cached.transport.close()
    } catch {
      // 关闭旧连接失败无所谓，丢弃即可
    }
  }
  const transport = buildTransport(config, true)
  cached = { key, transport, expiresAt: now + ttl * 1000 }
  return { transport, reuse: true }
}

export async function sendSmtpMail(config: SmtpConfig, input: SendMailInput) {
  const { transport, reuse } = acquireTransport(config)

  try {
    await transport.sendMail({
      from: config.fromName ? { name: config.fromName, address: config.from } : config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      disableFileAccess: true,
      disableUrlAccess: true,
      ...(config.replyTo ? { replyTo: config.replyTo } : {})
    })
  } finally {
    // 复用连接保持打开供后续邮件使用；非复用连接发完关闭
    if (!reuse) transport.close()
  }
}
