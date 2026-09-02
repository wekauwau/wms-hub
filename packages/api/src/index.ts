import Fastify from 'fastify'

const server = Fastify({ logger: true })

server.get('/health', async () => {
  return { status: 'ok' }
})

try {
  await server.listen({ port: Number(process.env['PORT']) || 3000, host: '0.0.0.0' })
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
