import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'

const migrationsDir = fileURLToPath(new URL('../../../../server/db/migrations/postgresql/', import.meta.url))

async function executeMigration(client: PGlite, name: string) {
  const sql = await readFile(`${migrationsDir}${name}`, 'utf8')
  const statements = sql
    .split('--> statement-breakpoint')
    .map(statement => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await client.exec(statement)
  }
}

describe('database migrations', () => {
  it('preserves application-local dates when converting daily timestamps', async () => {
    const client = new PGlite()
    await client.waitReady

    try {
      await executeMigration(client, '0000_heavy_la_nuit.sql')
      await client.exec(`
        insert into apis (
          code, path_version, endpoint_count, name, status, short_desc,
          description, http_method, api_path, doc_url
        ) values (
          'timezone-check', 'v1', 1, 'Timezone Check', 1, 'check',
          'check', 'GET', '/v1/timezone-check', ''
        )
      `)
      await client.exec(`
        insert into api_call_stats (
          api_id, stat_date, total_count, success_count, failure_count
        ) values (1, '2026-08-06 00:00:00+08', 3, 2, 1)
      `)
      await client.exec(`
        insert into api_daily_quota_usage (api_id, usage_date, used_count)
        values (1, '2026-08-06 00:00:00+08', 3)
      `)

      await client.query('select set_config($1, $2, false)', ['TimeZone', 'Asia/Shanghai'])
      await executeMigration(client, '0001_database_integrity.sql')

      const stats = await client.query<{
        statDate: string
        totalCount: number
        successCount: number
        failureCount: number
      }>(`
        select
          stat_date::text as "statDate",
          total_count as "totalCount",
          success_count as "successCount",
          failure_count as "failureCount"
        from api_call_stats
      `)
      const quota = await client.query<{ usageDate: string, usedCount: number }>(`
        select usage_date::text as "usageDate", used_count as "usedCount"
        from api_daily_quota_usage
      `)

      expect(stats.rows).toEqual([{
        statDate: '2026-08-06',
        totalCount: 3,
        successCount: 2,
        failureCount: 1
      }])
      expect(quota.rows).toEqual([{ usageDate: '2026-08-06', usedCount: 3 }])
    } finally {
      await client.close()
    }
  })
})
