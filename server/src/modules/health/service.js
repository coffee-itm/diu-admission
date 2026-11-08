const PING_TIMEOUT_MS = 2000

/**
 * Database readiness: connection state first, then a real ping (bounded by a timeout so a
 * half-dead connection cannot hang the probe).
 * @param {import('mongoose').Mongoose} mongoose
 * @returns {Promise<'ok' | 'connecting' | 'down'>}
 */
export async function checkDb(mongoose) {
  const state = mongoose.connection.readyState
  if (state === 2) return 'connecting'
  if (state !== 1) return 'down'
  let timer
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('ping timeout')), PING_TIMEOUT_MS)
    })
    await Promise.race([mongoose.connection.db.admin().ping(), timeout])
    return 'ok'
  } catch {
    return 'down'
  } finally {
    clearTimeout(timer)
  }
}
