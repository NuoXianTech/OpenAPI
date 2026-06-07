import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceMigrations = path.join(root, 'server/db/migrations/postgresql')
const outputRoot = path.join(root, '.output')
const outputServer = path.join(outputRoot, 'server')
const outputMigrations = path.join(outputServer, 'db/migrations/postgresql')
const rootNodeModules = path.join(root, 'node_modules')
const outputNodeModules = path.join(outputServer, 'node_modules')

// dereference: pnpm links node_modules/<pkg> into .pnpm via symlinks. Copying the
// real files (not the link) keeps .output self-contained once it is uploaded.
const copyOptions = { recursive: true, dereference: true }

// Plain postgres-js client replacing NuxtHub's generated db module, which targets
// Cloudflare rather than a single Node process.
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

// Every step writes to a distinct path, so they run concurrently.
await Promise.all([
  fs.cp(sourceMigrations, outputMigrations, copyOptions),
  fs.cp(path.join(rootNodeModules, 'drizzle-orm'), path.join(outputNodeModules, 'drizzle-orm'), copyOptions),
  fs.cp(path.join(rootNodeModules, 'postgres'), path.join(outputNodeModules, 'postgres'), copyOptions),
  fs.copyFile(path.join(root, 'scripts/migrate.mjs'), path.join(outputServer, 'migrate.mjs')),
  fs.copyFile(path.join(root, 'scripts/start.mjs'), path.join(outputServer, 'start.mjs')),
  fs.rm(path.join(outputServer, 'load-env.mjs'), { force: true }),
  fs.writeFile(path.join(outputNodeModules, '@nuxthub/db/db.mjs'), dbClientSource),
  fs.writeFile(path.join(outputRoot, 'start.mjs'), 'await import(\'./server/start.mjs\')\n'),
  fs.writeFile(path.join(outputRoot, 'package.json'), outputPackageJson)
])

console.log('[prepare-output] Copied migration runner and migrations into .output/server')
