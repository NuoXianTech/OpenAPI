import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    setupFiles: ['tests/e2e/setup/env.ts'],
    fileParallelism: false,
    testTimeout: 45_000,
    hookTimeout: 45_000,
  },
})
