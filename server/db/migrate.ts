import { runDatabaseMigrations as runMigrations } from '../../scripts/database-migrator.mjs'

export async function runDatabaseMigrations(): Promise<void> {
  await runMigrations()
}
