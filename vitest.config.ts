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
    environment: 'node',
    include: ['test/unit/**/*.{test,spec}.ts']
  },
  resolve: {
    alias: aliases
  }
})
