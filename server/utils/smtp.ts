import net from 'node:net'
import tls from 'node:tls'
import { Buffer } from 'node:buffer'

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

interface ResponseWaiter {
  codes: string[]
  resolve: (line: string) => void
  reject: (error: Error) => void
}

function buildMessage(from: string, to: string, subject: string, html: string) {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
  ]

  const body = html.replace(/\n/g, '\r\n')
  return `${headers.join('\r\n')}\r\n\r\n${body}\r\n`
}

export async function sendSmtpMail(config: SmtpConfig, input: SendMailInput) {
  const socket = config.secure
    ? tls.connect(config.port, config.host, { servername: config.host })
    : net.connect(config.port, config.host)

  socket.setEncoding('utf8')

  let buffer = ''
  const waiters: ResponseWaiter[] = []

  const readResponse = (codes: string[]) => new Promise<string>((resolve, reject) => {
    waiters.push({ codes, resolve, reject })
  })

  const flushLines = () => {
    while (buffer.includes('\n')) {
      const index = buffer.indexOf('\n')
      const line = buffer.slice(0, index).replace(/\r$/, '')
      buffer = buffer.slice(index + 1)

      const waiter = waiters[0]
      if (!waiter) {
        continue
      }

      if (line.length < 3) {
        continue
      }

      const code = line.slice(0, 3)
      const isDone = line[3] === ' '

      if (waiter.codes.includes(code) && isDone) {
        waiters.shift()
        waiter.resolve(line)
      }
    }
  }

  socket.on('data', (chunk) => {
    buffer += chunk
    flushLines()
  })

  socket.on('error', (error) => {
    const waiter = waiters.shift()
    if (waiter) {
      waiter.reject(error)
    }
  })

  const sendCommand = async (command: string, codes: string[]) => {
    socket.write(`${command}\r\n`)
    await readResponse(codes)
  }

  await readResponse(['220'])
  await sendCommand(`EHLO localhost`, ['250'])

  if (config.user && config.pass) {
    await sendCommand('AUTH LOGIN', ['334'])
    await sendCommand(Buffer.from(config.user).toString('base64'), ['334'])
    await sendCommand(Buffer.from(config.pass).toString('base64'), ['235'])
  }

  await sendCommand(`MAIL FROM:<${config.from}>`, ['250'])
  await sendCommand(`RCPT TO:<${input.to}>`, ['250', '251'])
  await sendCommand('DATA', ['354'])

  const message = buildMessage(config.from, input.to, input.subject, input.html)
  const dotStuffed = message.replace(/^\./gm, '..')
  socket.write(`${dotStuffed}\r\n.\r\n`)
  await readResponse(['250'])

  await sendCommand('QUIT', ['221'])
  socket.end()
}
