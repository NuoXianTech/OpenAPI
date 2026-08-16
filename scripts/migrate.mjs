import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runDatabaseMigrations } from './database-migrator.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))

function loadRuntimeEnv() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(scriptDirectory, '..', '.env'),
    path.resolve(scriptDirectory, '..', '..', '.env')
  ]

  for (const candidate of [...new Set(candidates)]) {
    if (!fs.existsSync(candidate)) continue

    process.loadEnvFile(candidate)
    console.log(`[db:migrate] Loaded environment from ${candidate}`)
    return
  }
}

loadRuntimeEnv()

try {
  await runDatabaseMigrations()
} catch (error) {
  console.error('[db:migrate] Migration failed.', error)
  process.exitCode = 1
}
