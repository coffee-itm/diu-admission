import fp from 'fastify-plugin'
import mongoose from 'mongoose'

const RETRY_MS = 5000

/**
 * Connects on `onReady`, closes on `onClose`, decorates `fastify.mongoose`.
 * If MongoDB is unreachable at startup the app still boots: `/health` stays 200 and `/ready`
 * returns 503 while we retry in the background (liveness vs readiness).
 */
export default fp(async function mongoosePlugin(app, { config, serverSelectionTimeoutMS = 5000 }) {
  let retryTimer = null
  let closing = false

  async function connect() {
    try {
      await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS })
      app.log.info('mongoose connected')
    } catch (err) {
      // Log the failure without the URI (it may carry credentials).
      app.log.error({ errName: err.name }, 'mongoose initial connect failed, will retry')
      if (!closing) {
        retryTimer = setTimeout(connect, RETRY_MS)
        retryTimer.unref()
      }
    }
  }

  app.decorate('mongoose', mongoose)
  app.addHook('onReady', connect)
  app.addHook('onClose', async () => {
    closing = true
    clearTimeout(retryTimer)
    await mongoose.disconnect()
    app.log.info('mongoose connection closed')
  })
}, { name: 'diu-mongoose' })
