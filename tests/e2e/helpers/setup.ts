import { setup } from '@nuxt/test-utils/e2e'

const targetHost = process.env.NUXT_TEST_HOST || process.env.TEST_HOST

export async function setupE2E() {
  if (targetHost) {
    await setup({
      host: targetHost,
      browser: false,
      setupTimeout: 120_000,
      teardownTimeout: 30_000,
    })
    return
  }

  await setup({
    server: true,
    browser: false,
    setupTimeout: 600_000,
    teardownTimeout: 60_000,
  })
}
