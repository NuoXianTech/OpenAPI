import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const appDir = fileURLToPath(new URL('./app', import.meta.url))
const sharedDir = fileURLToPath(new URL('./shared', import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/api-service-gateway.test.ts'],
    maxWorkers: 1,
    testTimeout: 30_000,
    hookTimeout: 30_000
  },
  resolve: {
    alias: {
      '~~': rootDir,
      '@@': rootDir,
      '~': appDir,
      '@': appDir,
      '#shared': sharedDir
    }
  }
})
