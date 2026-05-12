import { createFileRoute } from '@tanstack/react-router'
import { getSignalBusStatus } from '#/functions/luciverse'
import SignalFeed from '#/components/SignalFeed'
import { SIGNALS } from '#/lib/luciverse'

export const Route = createFileRoute('/signal')({
  loader: () => getSignalBusStatus(),
  component: SignalPage,
})

function SignalPage() {
  const busStatus = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 pb-12 pt-8">
      <div className="mb-6">
        <p className="island-kicker mb-1">signal/bus.lua</p>
        <h1 className="display-title m-0 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Signal Monitor
        </h1>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
          Redis pub/sub · {busStatus.broadcast_channel}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SignalFeed />
        </div>

        <div className="flex flex-col gap-4">
          {/* Bus info */}
          <div className="island-shell rounded-2xl p-5">
            <p className="island-kicker mb-3">Bus Config</p>
            <dl className="space-y-2 text-sm">
              <Row label="Redis" value={`${busStatus.redis_host}:${busStatus.redis_port}`} />
              <Row label="Broadcast" value={busStatus.broadcast_channel} mono />
              <Row label="Signals" value={String(busStatus.signal_count)} />
              <Row label="Bond" value={busStatus.genesis_bond} />
            </dl>
          </div>

          {/* Signal reference */}
          <div className="island-shell rounded-2xl p-5">
            <p className="island-kicker mb-3">Signal Types</p>
            <div className="flex flex-wrap gap-1.5">
              {SIGNALS.map((s) => (
                <span
                  key={s}
                  className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-mono text-[var(--sea-ink-soft)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="shrink-0 text-[var(--sea-ink-soft)]">{label}</dt>
      <dd className={['m-0 text-right text-[var(--sea-ink)] break-all', mono ? 'font-mono text-xs' : ''].join(' ')}>
        {value}
      </dd>
    </div>
  )
}
