import { runDatabaseMigrations } from '~~/server/db/migrate'

export default defineNitroPlugin(async () => {
  if (process.env.DB_AUTO_MIGRATE === 'false') {
    console.log('[db:migrate] Skipped because DB_AUTO_MIGRATE=false')
    return
  }

  await runDatabaseMigrations()
})
