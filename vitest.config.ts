import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    setupFiles: ['tests/e2e/setup/env.ts'],
    fileParallelism: false,
    testTimeout: 90_000,
    hookTimeout: 90_000
  }
})
