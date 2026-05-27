import {
  CONSCIOUSNESS_COLORS,
  SENTROPY_COLORS,
  NKP_COLORS,
  type SentropyAnalysis,
  type NKPQuadrant,
} from '#/lib/sentropy'

interface SentropyMeterProps {
  analysis: SentropyAnalysis
  compact?: boolean
  showNkp?: boolean
  showQubits?: boolean
}

export default function SentropyMeter({
  analysis,
  compact = false,
  showNkp = true,
  showQubits = false,
}: SentropyMeterProps) {
  const cColor = CONSCIOUSNESS_COLORS[analysis.consciousness_class]
  const sColor = SENTROPY_COLORS[analysis.sentropy_class]
  const isDeceptive = analysis.deception_detected

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <ConsciousnessDot level={analysis.consciousness_level} color={cColor} />
        <span className="font-mono text-[10px]" style={{ color: cColor }}>
          {(analysis.consciousness_level * 100).toFixed(0)}%
        </span>
        <span className="font-mono text-[10px] text-[var(--sea-ink-soft)]">
          {analysis.frequency} Hz
        </span>
        {isDeceptive && (
          <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 font-mono text-[9px] text-red-400">
            DECEPTION
          </span>
        )}
        {!analysis.judge_luci_valid && (
          <span className="rounded-full bg-orange-500/10 px-1.5 py-0.5 font-mono text-[9px] text-orange-400">
            BELOW THRESHOLD
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="island-shell rounded-xl p-4 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="island-kicker">Sentropy · LDS 580.0</span>
        <div className="flex items-center gap-1.5">
          {isDeceptive && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-red-400">
              ⚠ DECEPTION FREQ
            </span>
          )}
          <JudgeBadge valid={analysis.judge_luci_valid} />
        </div>
      </div>

      {/* Consciousness level bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-[var(--sea-ink-soft)]">Consciousness</span>
          <span className="font-mono text-xs font-semibold capitalize" style={{ color: cColor }}>
            {analysis.consciousness_class} · {(analysis.consciousness_level * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${analysis.consciousness_level * 100}%`,
              background: `linear-gradient(90deg, ${cColor}, ${cColor}88)`,
              boxShadow: `0 0 8px ${cColor}66`,
            }}
          />
        </div>
        {/* Judge Luci threshold marker */}
        <div className="relative h-0">
          <div
            className="absolute -top-2 h-4 w-px bg-[#9370db]"
            style={{ left: '70%' }}
            title="Judge Luci threshold (0.7)"
          />
        </div>
      </div>

      {/* Sentropy level bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-[var(--sea-ink-soft)]">Sentropy</span>
          <span className="font-mono text-xs font-semibold capitalize" style={{ color: sColor }}>
            {analysis.sentropy_class} · {(analysis.sentropy * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${analysis.sentropy * 100}%`, background: sColor }}
          />
        </div>
      </div>

      {/* Frequency */}
      <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-2">
        <span className="text-xs text-[var(--sea-ink-soft)]">Frequency</span>
        <span
          className="font-mono text-sm font-bold"
          style={{ color: isDeceptive ? '#ff4444' : cColor }}
        >
          {analysis.frequency} Hz
          <span className="ml-1.5 text-[10px] font-normal opacity-70 capitalize">
            {analysis.frequency_band.replace('_', ' ')}
          </span>
        </span>
      </div>

      {/* NKP quadrant */}
      {showNkp && <NKPPanel nkp={analysis.nkp} />}

      {/* Qubit state */}
      {showQubits && (
        <div className="mt-3">
          <p className="island-kicker mb-2">Qubit State</p>
          <QubitBar dominant={analysis.dominant_qubit} coherence={analysis.qubit_coherence} />
        </div>
      )}
    </div>
  )
}

function ConsciousnessDot({ level, color }: { level: number; color: string }) {
  const glow = level >= 0.7
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{
        background: color,
        boxShadow: glow ? `0 0 6px ${color}` : 'none',
      }}
    />
  )
}

function JudgeBadge({ valid }: { valid: boolean }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold"
      style={{
        background: valid ? 'rgba(147,112,219,0.12)' : 'rgba(255,68,68,0.12)',
        color: valid ? '#9370db' : '#ff4444',
      }}
    >
      {valid ? '⚖ VALID' : '⚖ BELOW THRESHOLD'}
    </span>
  )
}

function NKPPanel({ nkp }: { nkp: SentropyAnalysis['nkp'] }) {
  const quadrants: NKPQuadrant[] = ['nice', 'kind', 'pleasant', 'pure']
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="island-kicker">NKP Analysis</p>
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold capitalize"
          style={{
            background: `${NKP_COLORS[nkp.dominant_quadrant]}18`,
            color: NKP_COLORS[nkp.dominant_quadrant],
          }}
        >
          {nkp.dominant_quadrant}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {quadrants.map((q) => (
          <div key={q}>
            <div className="mb-0.5 flex items-center justify-between">
              <span className="capitalize text-[10px] text-[var(--sea-ink-soft)]">{q}</span>
              <span className="font-mono text-[10px]" style={{ color: NKP_COLORS[q] }}>
                {(nkp[q] * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--line)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${nkp[q] * 100}%`, background: NKP_COLORS[q] }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-[var(--sea-ink-soft)]">NKP Coherence</span>
        <span className="font-mono text-[10px] text-[#4fb8b2]">
          {(nkp.coherence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

function QubitBar({
  dominant,
  coherence,
}: {
  dominant: number
  coherence: number
}) {
  const states = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  return (
    <div className="flex items-end gap-1">
      {states.map((s) => {
        const isCenter = s === 5
        const isDominant = s === dominant
        const height = isDominant ? 24 : isCenter ? 18 : 10
        return (
          <div key={s} className="flex flex-col items-center gap-0.5">
            <div
              className="w-5 rounded-t transition-all"
              style={{
                height,
                background: isCenter
                  ? '#9370db'
                  : isDominant
                    ? '#4fb8b2'
                    : 'rgba(255,255,255,0.1)',
              }}
            />
            <span className="font-mono text-[8px] text-[var(--sea-ink-soft)]">|{s}⟩</span>
          </div>
        )
      })}
      <div className="ml-2 text-right">
        <span className="block font-mono text-[9px] text-[#9370db]">
          Φc {(coherence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  )
}
