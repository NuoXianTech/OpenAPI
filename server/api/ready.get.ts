import { sql } from 'drizzle-orm'
import { setResponseHeader, setResponseStatus } from 'h3'
import { db } from '~~/server/db/client'
import { readRedisReadiness } from '~~/server/utils/redis'

async function readDatabaseReadiness(): Promise<{ ready: boolean }> {
  try {
    await db.execute(sql`select 1`)
    return { ready: true }
  } catch {
    return { ready: false }
  }
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const [database, redis] = await Promise.all([
    readDatabaseReadiness(),
    readRedisReadiness()
  ])
  const ready = database.ready && (redis.ready || !redis.required)
  const degraded = ready && redis.configured && !redis.ready

  if (!ready) setResponseStatus(event, 503)

  return {
    ready,
    degraded,
    database,
    redis,
    ts: Date.now()
  }
})
