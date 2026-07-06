import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceMigrations = path.join(root, 'server/db/migrations/postgresql')
const outputRoot = path.join(root, '.output')
const outputServer = path.join(outputRoot, 'server')
const outputMigrations = path.join(outputServer, 'db/migrations/postgresql')
const outputNodeModules = path.join(outputServer, 'node_modules')

// Plain postgres-js client replacing NuxtHub's generated db module, which targets
// Cloudflare and bakes the connection at build time; this reads DATABASE_URL at
// runtime instead.
const dbClientSource = [
  'import postgres from \'postgres\'',
  'import { drizzle } from \'drizzle-orm/postgres-js\'',
  'import * as schema from \'./schema.mjs\'',
  '',
  'const connectionString = process.env.DATABASE_URL',
  'if (!connectionString) {',
  '  throw new Error(\'DATABASE_URL is required to start the database client.\')',
  '}',
  '',
  'const max = Number.parseInt(process.env.DATABASE_POOL_SIZE || \'10\', 10)',
  'const client = postgres(connectionString, { max })',
  'const db = drizzle(client, { schema })',
  '',
  'export { db, schema }',
  ''
].join('\n')

const outputPackageJson = `${JSON.stringify({
  type: 'module',
  scripts: {
    start: 'node start.mjs'
  }
}, null, 2)}\n`

const outputServerStartSource = [
  'await import(\'./migrate.mjs\')',
  'await import(\'./index.mjs\')',
  ''
].join('\n')

// Every step writes to a distinct path, so they run concurrently. postgres and
// drizzle-orm are pulled into node_modules by Nitro's externals.traceInclude
// (see nuxt.config.ts), so they are not copied here.
await Promise.all([
  // NuxtHub's build copies only the migration .sql, not the meta/ folder, so
  // migrate.mjs (which locates migrations via meta/_journal.json) needs this
  // full copy. Not redundant — do not remove.
  fs.cp(sourceMigrations, outputMigrations, { recursive: true }),
  fs.copyFile(path.join(root, 'scripts/migrate.mjs'), path.join(outputServer, 'migrate.mjs')),
  fs.rm(path.join(outputServer, 'load-env.mjs'), { force: true }),
  fs.writeFile(path.join(outputNodeModules, '@nuxthub/db/db.mjs'), dbClientSource),
  fs.writeFile(path.join(outputServer, 'start.mjs'), outputServerStartSource),
  fs.writeFile(path.join(outputRoot, 'start.mjs'), 'await import(\'./server/start.mjs\')\n'),
  fs.writeFile(path.join(outputRoot, 'package.json'), outputPackageJson)
])

console.log('[prepare-output] Copied migration runner and migrations into .output/server')
