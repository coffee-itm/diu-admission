import { ConfigError, loadConfig } from './config.js'
import { buildApp } from './app.js'

const FORCE_EXIT_MS = 10_000

let config
try {
  config = loadConfig()
} catch (err) {
  // Plain stderr: the logger is not configured yet. ConfigError never contains values.
  console.error(err instanceof ConfigError ? err.message : err)
  process.exit(1)
}

const app = await buildApp({ config })

let shuttingDown = false
async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  app.log.info({ signal }, 'shutdown signal received, closing server')
  const force = setTimeout(() => {
    app.log.fatal('graceful shutdown timed out, forcing exit')
    process.exit(1)
  }, FORCE_EXIT_MS)
  force.unref()
  try {
    await app.close() // stops accepting, drains in-flight requests, closes Mongo (onClose)
    app.log.info('server closed')
    process.exit(0)
  } catch (err) {
    app.log.fatal({ err }, 'error during shutdown')
    process.exit(1)
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('unhandledRejection', (err) => {
  app.log.fatal({ err }, 'unhandled rejection')
  process.exit(1)
})

try {
  await app.listen({ port: config.PORT, host: config.HOST })
} catch (err) {
  app.log.fatal({ err }, 'failed to start')
  process.exit(1)
}
