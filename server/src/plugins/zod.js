import fp from 'fastify-plugin'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

// Zod schemas (shared with the SPA) validate input and serialize output. The response
// serializer strips unknown fields: the second line of defence for `correctAnswer`.
export default fp(async function zodPlugin(app) {
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
}, { name: 'diu-zod' })
