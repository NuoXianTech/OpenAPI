#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import postgres from 'postgres'

function parsePositiveInt(value, fallbackValue) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue
  }
  return Math.trunc(parsed)
}

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.LOADTEST_BASE_URL || 'http://localhost:3000',
    endpoint: process.env.LOADTEST_ENDPOINT || '/api/v1/test',
    method: (process.env.LOADTEST_METHOD || 'GET').toUpperCase(),
    requests: parsePositiveInt(process.env.LOADTEST_REQUESTS, 1000),
    concurrency: parsePositiveInt(process.env.LOADTEST_CONCURRENCY, 1000),
    timeoutMs: parsePositiveInt(process.env.LOADTEST_TIMEOUT_MS, 15000),
    apiKey: process.env.LOADTEST_API_KEY || '',
    settleMs: parsePositiveInt(process.env.LOADTEST_SETTLE_MS, 5000),
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) {
      continue
    }

    const [rawKey, rawInlineValue] = arg.slice(2).split('=')
    const key = rawKey.trim()
    const next = argv[i + 1]
    const value = rawInlineValue !== undefined ? rawInlineValue : next

    if (rawInlineValue === undefined && next && !next.startsWith('--')) {
      i += 1
    }

    if (value === undefined) {
      continue
    }

    if (key === 'base-url') {
      options.baseUrl = value
    }
    if (key === 'endpoint') {
      options.endpoint = value
    }
    if (key === 'method') {
      options.method = value.toUpperCase()
    }
    if (key === 'requests') {
      options.requests = parsePositiveInt(value, options.requests)
    }
    if (key === 'concurrency') {
      options.concurrency = parsePositiveInt(value, options.concurrency)
    }
    if (key === 'timeout-ms') {
      options.timeoutMs = parsePositiveInt(value, options.timeoutMs)
    }
    if (key === 'api-key') {
      options.apiKey = value
    }
    if (key === 'settle-ms') {
      options.settleMs = parsePositiveInt(value, options.settleMs)
    }
  }

  if (!options.endpoint.startsWith('/')) {
    options.endpoint = `/${options.endpoint}`
  }

  return options
}

function getUtcDayStart(value = new Date()) {
  const date = new Date(value)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

function stripEnvQuotes(value) {
  if (!value) {
    return value
  }

  const isWrappedByDoubleQuotes = value.startsWith('"') && value.endsWith('"')
  const isWrappedBySingleQuotes = value.startsWith('\'') && value.endsWith('\'')
  if (isWrappedByDoubleQuotes || isWrappedBySingleQuotes) {
    return value.slice(1, -1)
  }

  return value
}

async function readEnvFileValues() {
  try {
    const content = await readFile('.env', 'utf8')
    const values = {}

    for (const line of content.split(/\r?\n/u)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex <= 0) {
        continue
      }

      const key = trimmed.slice(0, separatorIndex).trim()
      const rawValue = trimmed.slice(separatorIndex + 1).trim()
      values[key] = stripEnvQuotes(rawValue)
    }

    return values
  }
  catch {
    return {}
  }
}

async function resolveDatabaseUrl() {
  const fromProcess = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_URL
  if (fromProcess) {
    return fromProcess
  }

  const fromDotEnv = await readEnvFileValues()
  return fromDotEnv.DATABASE_URL || fromDotEnv.POSTGRES_URL || fromDotEnv.PG_URL || ''
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function sortStatusEntries(statusCounts) {
  return Array.from(statusCounts.entries()).sort((a, b) => {
    const [statusA] = a
    const [statusB] = b
    return Number(statusA) - Number(statusB)
  })
}

async function getSnapshot(sqlClient, endpoint, statDate) {
  const [callsRow] = await sqlClient`
    select count(*)::bigint as total
    from api_calls
    where path = ${endpoint}
  `

  const [statsRow] = await sqlClient`
    select coalesce(sum(total_count), 0)::bigint as total
    from api_call_stats
    where api_path = ${endpoint}
      and stat_date = ${statDate}
  `

  return {
    callRows: Number(callsRow?.total || 0),
    statTotal: Number(statsRow?.total || 0),
  }
}

async function requestOnce({ requestUrl, method, timeoutMs, apiKey, index }) {
  const url = new URL(requestUrl)
  url.searchParams.set('__loadtest', `${Date.now()}-${index}`)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method,
      headers: apiKey ? { 'x-api-key': apiKey } : undefined,
      signal: controller.signal,
    })

    return {
      ok: true,
      status: response.status,
    }
  }
  catch (error) {
    return {
      ok: false,
      status: 'ERR',
      error,
    }
  }
  finally {
    clearTimeout(timer)
  }
}

async function runLoad(options) {
  const statusCounts = new Map()
  const errorMessages = []
  const total = options.requests
  const workers = Math.min(options.concurrency, total)
  let pointer = 0

  async function worker() {
    while (true) {
      const current = pointer
      pointer += 1
      if (current >= total) {
        return
      }

      const result = await requestOnce({
        requestUrl: options.requestUrl,
        method: options.method,
        timeoutMs: options.timeoutMs,
        apiKey: options.apiKey,
        index: current,
      })

      const count = statusCounts.get(result.status) || 0
      statusCounts.set(result.status, count + 1)

      if (!result.ok && errorMessages.length < 5) {
        const message = result.error instanceof Error ? result.error.message : String(result.error)
        errorMessages.push(message)
      }
    }
  }

  const startedAt = Date.now()
  await Promise.all(Array.from({ length: workers }, () => worker()))
  const elapsedMs = Date.now() - startedAt

  return {
    elapsedMs,
    statusCounts,
    errorMessages,
  }
}

function printSummary(summary) {
  const statusText = sortStatusEntries(summary.statusCounts)
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ')

  console.log('')
  console.log('========== API Stats Load Test =========')
  console.log(`Target URL: ${summary.requestUrl}`)
  console.log(`Method: ${summary.method}`)
  console.log(`Planned Requests: ${summary.plannedRequests}`)
  console.log(`Concurrency: ${summary.concurrency}`)
  console.log(`Elapsed: ${summary.elapsedMs} ms`)
  console.log(`Status Counts: ${statusText || 'none'}`)
  console.log(`api_calls Delta: ${summary.callDelta}`)
  console.log(`api_call_stats.total_count Delta: ${summary.statDelta}`)
  console.log(`Reconciliation: ${summary.passed ? 'PASS' : 'FAIL'}`)

  if (summary.errorMessages.length > 0) {
    console.log('Sample Errors:')
    for (const message of summary.errorMessages) {
      console.log(`- ${message}`)
    }
  }

  console.log('=======================================')
  console.log('')
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const dbUrl = await resolveDatabaseUrl()
  if (!dbUrl) {
    console.error('DATABASE_URL is required. Set env or provide it in .env.')
    process.exitCode = 1
    return
  }

  const requestUrl = new URL(options.endpoint, options.baseUrl)
  const sqlClient = postgres(dbUrl, {
    max: 4,
  })

  try {
    const statDate = getUtcDayStart(new Date())

    // Warm up once so /api/v1/test can auto-create the test API definition.
    await requestOnce({
      requestUrl,
      method: options.method,
      timeoutMs: options.timeoutMs,
      apiKey: options.apiKey,
      index: -1,
    })

    const before = await getSnapshot(sqlClient, options.endpoint, statDate)
    const loadResult = await runLoad({
      ...options,
      requestUrl,
    })

    await sleep(options.settleMs)

    const after = await getSnapshot(sqlClient, options.endpoint, statDate)
    const callDelta = after.callRows - before.callRows
    const statDelta = after.statTotal - before.statTotal
    const errorCount = loadResult.statusCounts.get('ERR') || 0

    const summary = {
      requestUrl: requestUrl.toString(),
      method: options.method,
      plannedRequests: options.requests,
      concurrency: Math.min(options.concurrency, options.requests),
      elapsedMs: loadResult.elapsedMs,
      statusCounts: loadResult.statusCounts,
      callDelta,
      statDelta,
      errorMessages: loadResult.errorMessages,
      passed:
        errorCount === 0
        && callDelta === options.requests
        && statDelta === options.requests,
    }

    printSummary(summary)

    if (!summary.passed) {
      process.exitCode = 1
    }
  }
  finally {
    await sqlClient.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error('load test failed:', error)
  process.exitCode = 1
})
