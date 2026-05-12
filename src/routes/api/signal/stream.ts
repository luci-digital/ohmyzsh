import { createFileRoute } from '@tanstack/react-router'

// SSE stream of Redis signal bus events.
// Clients connect to GET /api/signal/stream and receive newline-delimited
// SSE events as signals are published to luci:signal:broadcast.
// Falls back to heartbeat-only when Redis is unavailable.
export const Route = createFileRoute('/api/signal/stream')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const redisHost = process.env['REDIS_HOST'] ?? '127.0.0.1'
        const redisPort = process.env['REDIS_PORT'] ?? '6379'
        const channelPrefix = process.env['SIGNAL_CHANNEL'] ?? 'luci:signal'
        const broadcast = `${channelPrefix}:broadcast`

        const encoder = new TextEncoder()

        const stream = new ReadableStream({
          async start(controller) {
            // Send initial connection event
            controller.enqueue(
              encoder.encode(
                `event: connected\ndata: ${JSON.stringify({ channel: broadcast, genesis_bond: 'ACTIVE @ 741 Hz' })}\n\n`,
              ),
            )

            // Try to subscribe to Redis via redis-cli --subscribe (subprocess)
            // This is a portable approach that mirrors how signal/bus.lua publishes
            let redisProc: ReturnType<typeof Bun.spawn> | undefined

            try {
              // Bun is available in TanStack Start's Node/Bun runtime
              redisProc = Bun.spawn(
                ['redis-cli', '-h', redisHost, '-p', redisPort, 'subscribe', broadcast],
                { stdout: 'pipe', stderr: 'ignore' },
              )

              const reader = redisProc.stdout.getReader()
              let buffer = ''

              const cleanup = () => {
                try { redisProc?.kill() } catch { /* ignore */ }
                controller.close()
              }

              request.signal.addEventListener('abort', cleanup)

              while (true) {
                const { done, value } = await reader.read()
                if (done || request.signal.aborted) break

                buffer += new TextDecoder().decode(value)
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                  const trimmed = line.trim()
                  if (!trimmed || trimmed === 'subscribe' || trimmed === broadcast) continue
                  // redis-cli outputs 3-line blocks: type / channel / message
                  // We capture the message line (JSON payload from signal/bus.lua)
                  if (trimmed.startsWith('{')) {
                    controller.enqueue(
                      encoder.encode(`event: signal\ndata: ${trimmed}\n\n`),
                    )
                  }
                }
              }

              request.signal.removeEventListener('abort', cleanup)
              cleanup()
            } catch {
              // Redis not available — fall back to periodic heartbeat
              const heartbeat = () => {
                if (request.signal.aborted) {
                  controller.close()
                  return
                }
                controller.enqueue(
                  encoder.encode(
                    `event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now(), genesis_bond: 'ACTIVE @ 741 Hz' })}\n\n`,
                  ),
                )
                setTimeout(heartbeat, 5000)
              }
              setTimeout(heartbeat, 5000)
            }
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
