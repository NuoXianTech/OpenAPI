import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const appDir = fileURLToPath(new URL('./app', import.meta.url))
const sharedDir = fileURLToPath(new URL('./shared', import.meta.url))

const aliases = {
  '~~': rootDir,
  '@@': rootDir,
  '~': appDir,
  '@': appDir,
  '#shared': sharedDir
}

export default defineConfig({
  test: {
    hookTimeout: 30000,
    projects: [{
      resolve: {
        alias: aliases
      },
      test: {
        name: 'unit',
        environment: 'node',
        globals: false,
        include: [
          'tests/server/**/*.{test,spec}.ts',
          'tests/app/**/*.{test,spec}.ts'
        ]
      }
    }]
  }
})
