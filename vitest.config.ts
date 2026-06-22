import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const appDir = fileURLToPath(new URL('./app', import.meta.url))

const aliases = {
  '~~': rootDir,
  '@@': rootDir,
  '~': appDir,
  '@': appDir
}

export default defineConfig({
  test: {
    hookTimeout: 30000,
    projects: [
      {
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
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          environment: 'nuxt',
          globals: false,
          hookTimeout: 30000,
          include: ['tests/nuxt/**/*.{test,spec}.ts'],
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom'
            }
          }
        }
      })
    ]
  }
})
