import { closeRedis, getRedisConfig, initializeRedis } from '~~/server/utils/redis'

export default defineNitroPlugin((nitroApp) => {
  const config = getRedisConfig()
  const initialization = initializeRedis().catch((error) => {
    if (config.required) throw error
    console.warn('[redis] Initial connection failed; optional memory fallback remains active')
    return null
  })
  const readiness = initialization.then(() => undefined)
  const removeInitializationGate = nitroApp.hooks.hook('request', () => readiness)

  void initialization
    .then((client) => {
      removeInitializationGate()
      console.info(client ? '[redis] Connection ready.' : '[redis] Not configured; memory fallback active.')
    })
    .catch((error) => {
      console.error('[redis] Required Redis initialization failed.', error)
      process.exit(1)
    })

  nitroApp.hooks.hook('close', closeRedis)
})
