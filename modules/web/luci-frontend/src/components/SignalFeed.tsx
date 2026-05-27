import { useEffect, useRef, useState } from 'react'
import type { SignalMessage } from '#/lib/luciverse'

const MAX_EVENTS = 50

type FeedEvent =
  | { type: 'signal'; data: SignalMessage; ts: number }
  | { type: 'heartbeat'; ts: number }
  | { type: 'connected'; channel: string; ts: number }
  | { type: 'error'; message: string; ts: number }

export default function SignalFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/signal/stream')
    esRef.current = es

    es.addEventListener('connected', (e) => {
      setConnected(true)
      const d = JSON.parse((e as MessageEvent).data)
      setEvents((prev) => [
        { type: 'connected', channel: d.channel, ts: Date.now() },
        ...prev,
      ].slice(0, MAX_EVENTS))
    })

    es.addEventListener('signal', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as SignalMessage
        setEvents((prev) => [
          { type: 'signal', data, ts: Date.now() },
          ...prev,
        ].slice(0, MAX_EVENTS))
      } catch { /* ignore malformed */ }
    })

    es.addEventListener('heartbeat', () => {
      setEvents((prev) => [
        { type: 'heartbeat', ts: Date.now() },
        ...prev,
      ].slice(0, MAX_EVENTS))
    })

    es.onerror = () => {
      setConnected(false)
      setEvents((prev) => [
        { type: 'error', message: 'Connection lost — reconnecting…', ts: Date.now() },
        ...prev,
      ].slice(0, MAX_EVENTS))
    }

    return () => es.close()
  }, [])

  return (
    <div className="island-shell flex flex-col rounded-2xl">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
        <p className="island-kicker m-0">Signal Bus</p>
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={[
              'h-2 w-2 rounded-full',
              connected ? 'bg-[var(--lagoon)] shadow-[0_0_6px_rgba(79,184,178,0.7)]' : 'bg-[var(--sea-ink-soft)]',
            ].join(' ')}
          />
          <span className="text-[var(--sea-ink-soft)]">
            {connected ? 'live' : 'reconnecting'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 font-mono text-xs" style={{ minHeight: 200, maxHeight: 400 }}>
        {events.length === 0 && (
          <p className="text-center text-[var(--sea-ink-soft)] pt-8">
            Waiting for signals on luci:signal:broadcast…
          </p>
        )}
        {events.map((ev, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="shrink-0 text-[var(--sea-ink-soft)]">
              {new Date(ev.ts).toLocaleTimeString()}
            </span>
            {ev.type === 'signal' && (
              <>
                <span className="shrink-0 font-bold text-[var(--lagoon-deep)]">[{ev.data.signal}]</span>
                <span className="text-[var(--sea-ink)]">
                  {ev.data.source_did}
                  {ev.data.target_did !== '*' ? ` → ${ev.data.target_did}` : ' → *'}
                </span>
              </>
            )}
            {ev.type === 'heartbeat' && (
              <span className="text-[var(--sea-ink-soft)]">— heartbeat</span>
            )}
            {ev.type === 'connected' && (
              <span className="text-[var(--palm)]">
                connected to {ev.channel}
              </span>
            )}
            {ev.type === 'error' && (
              <span className="text-red-500">{ev.message}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
