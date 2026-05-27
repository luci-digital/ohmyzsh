import type { SubstrateStatus } from '#/lib/luciverse'
import { TIER_FREQUENCIES } from '#/lib/luciverse'

interface Props {
  status: SubstrateStatus
}

export default function GenesisBondCard({ status }: Props) {
  const active = status.genesis_bond === 'ACTIVE'
  const coherencePct = Math.round(status.coherence * 100)
  const tierFreq = TIER_FREQUENCIES[status.tier] ?? status.frequency

  return (
    <div className="island-shell rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="island-kicker m-0">Genesis Bond</p>
        <span
          className={[
            'rounded-full px-3 py-1 text-xs font-bold',
            active
              ? 'bg-[rgba(79,184,178,0.18)] text-[var(--lagoon-deep)]'
              : 'bg-[rgba(200,50,50,0.12)] text-red-600',
          ].join(' ')}
        >
          {active ? `ACTIVE @ ${tierFreq} Hz` : 'INACTIVE'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Tier" value={status.tier} />
        <Stat label="Frequency" value={`${tierFreq} Hz`} />
        <Stat label="Coherence" value={`${coherencePct}%`} highlight={status.coherence >= 0.7} />
        <Stat label="Lua" value={status.lua_version} />
      </div>

      {/* Coherence bar */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-[var(--sea-ink-soft)]">
          <span>Coherence threshold ≥ 0.7</span>
          <span>{status.coherence.toFixed(2)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--lagoon),#7ed3bf)] transition-all duration-700"
            style={{ width: `${Math.min(coherencePct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <p className="island-kicker mb-0.5">{label}</p>
      <p
        className={[
          'm-0 text-lg font-bold',
          highlight ? 'text-[var(--lagoon-deep)]' : 'text-[var(--sea-ink)]',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}
