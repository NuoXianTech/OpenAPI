import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceMigrations = path.join(root, 'server/db/migrations/postgresql')
const outputRoot = path.join(root, '.output')
const outputServer = path.join(root, '.output/server')
const outputMigrations = path.join(outputServer, 'db/migrations/postgresql')
const rootNodeModules = path.join(root, 'node_modules')
const outputNodeModules = path.join(outputServer, 'node_modules')

async function copyDir(source, target) {
  await fs.mkdir(target, { recursive: true })
  const entries = await fs.readdir(source, { withFileTypes: true })

  for (const entry of entries) {
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)

    if (entry.isDirectory()) {
      await copyDir(from, to)
      continue
    }

    await fs.copyFile(from, to)
  }
}

await copyDir(sourceMigrations, outputMigrations)
await copyDir(
  path.join(rootNodeModules, 'drizzle-orm'),
  path.join(outputNodeModules, 'drizzle-orm')
)
await copyDir(
  path.join(rootNodeModules, 'postgres'),
  path.join(outputNodeModules, 'postgres')
)
await fs.copyFile(path.join(root, 'scripts/migrate.mjs'), path.join(outputServer, 'migrate.mjs'))
await fs.copyFile(path.join(root, 'scripts/start.mjs'), path.join(outputServer, 'start.mjs'))
await fs.rm(path.join(outputServer, 'load-env.mjs'), { force: true })
await fs.writeFile(path.join(outputRoot, 'start.mjs'), 'await import(\'./server/start.mjs\')\n')
await fs.writeFile(
  path.join(outputRoot, 'package.json'),
  `${JSON.stringify({
    type: 'module',
    scripts: {
      start: 'node start.mjs'
    }
  }, null, 2)}\n`
)

console.log('[prepare-output] Copied migration runner and migrations into .output/server')
