import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.{test,spec}.ts'],
    fileParallelism: false
  }
})
