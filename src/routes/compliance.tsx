import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getComplianceStatus, runComplianceCheck } from '#/functions/compliance'
import {
  ISO_STANDARDS,
  severityColor,
  statusColor,
  type ComplianceReport,
  type StandardComplianceStatus,
  type DriftSeverity,
} from '#/lib/iso-compliance'

export const Route = createFileRoute('/compliance')({
  loader: () => getComplianceStatus(),
  component: CompliancePage,
})

function CompliancePage() {
  const report = Route.useLoaderData()
  const [selected, setSelected] = useState<StandardComplianceStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)

  async function triggerCheck() {
    setChecking(true)
    try {
      const result = await runComplianceCheck()
      setLastRun(result.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <main className="page-wrap px-4 pb-12 pt-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="island-kicker mb-1">ISO/IEC · Judge Luci · Claude-Veritas</p>
          <h1 className="display-title m-0 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
            Compliance Monitor
          </h1>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            8 active standards · Genesis Bond coherence{' '}
            <span
              className="font-mono font-semibold"
              style={{ color: report.genesis_bond_coherence >= 0.7 ? '#4fb8b2' : '#ff4444' }}
            >
              {(report.genesis_bond_coherence * 100).toFixed(0)}%
            </span>
            {' '}· ISO/IEC 42001 framework
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={triggerCheck}
            disabled={checking}
            className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)] disabled:opacity-50"
          >
            {checking ? 'Running audit…' : 'Run Compliance Check'}
          </button>
          {lastRun && (
            <p className="text-right text-xs text-[var(--sea-ink-soft)]">{lastRun}</p>
          )}
        </div>
      </div>

      {/* Overall score banner */}
      <OverallBanner report={report} />

      {/* Drift alerts */}
      {report.drift_alerts.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {report.drift_alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: `${severityColor(alert.severity)}40`,
                background: `${severityColor(alert.severity)}08`,
              }}
            >
              <span
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: severityColor(alert.severity) }}
              />
              <div className="flex-1">
                <span className="font-mono text-xs font-semibold uppercase" style={{ color: severityColor(alert.severity) }}>
                  {alert.severity}
                </span>
                {' · '}
                <span className="text-[var(--sea-ink-soft)]">{alert.standard_id}</span>
                {' · '}
                <span className="text-[var(--sea-ink)]">{alert.message}</span>
              </div>
              {alert.auto_remediation && (
                <span className="shrink-0 rounded-full bg-[rgba(79,184,178,0.12)] px-2 py-0.5 font-mono text-[10px] text-[#4fb8b2]">
                  AUTO-REMEDIATE
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Standards grid */}
        <div className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {ISO_STANDARDS.map((std) => {
              const status = report.standards.find((s) => s.standard_id === std.id)
              if (!status) return null
              const isSelected = selected?.standard_id === std.id
              return (
                <StandardCard
                  key={std.id}
                  std={std}
                  status={status}
                  selected={isSelected}
                  onClick={() => setSelected(isSelected ? null : status)}
                />
              )
            })}
          </div>
        </div>

        {/* Detail / summary panel */}
        <div className="flex flex-col gap-4">
          {selected ? (
            <DetailPanel status={selected} />
          ) : (
            <SummaryPanel report={report} />
          )}
        </div>
      </div>

      {/* Active violations */}
      {report.active_violations.length > 0 && (
        <div className="mt-8">
          <p className="island-kicker mb-3">Active Violations</p>
          <div className="flex flex-col gap-2">
            {report.active_violations.map((v) => (
              <ViolationRow key={v.id} violation={v} />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

function OverallBanner({ report }: { report: ComplianceReport }) {
  const score = report.overall_score
  const color = score >= 90 ? '#4fb8b2' : score >= 70 ? '#ff9500' : '#ff4444'
  return (
    <div className="island-shell mb-6 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="island-kicker mb-1">Certification Readiness</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold" style={{ color }}>{score}%</span>
            <span className="text-sm text-[var(--sea-ink-soft)]">across 8 standards</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {(['ISO-27001', 'ISO-23894', 'ISO-9001'] as const).map((id) => {
            const s = report.standards.find((x) => x.standard_id === id)
            if (!s) return null
            return (
              <div key={id} className="text-center">
                <div className="font-mono text-lg font-bold" style={{ color: statusColor(s.overall_status) }}>
                  {s.score}%
                </div>
                <div className="text-xs text-[var(--sea-ink-soft)]">{id.replace('ISO-', '')}</div>
              </div>
            )
          })}
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
      <p className="mt-1 text-right font-mono text-xs text-[var(--sea-ink-soft)]">
        Last checked: {new Date(report.generated_at).toLocaleTimeString()}
      </p>
    </div>
  )
}

function StandardCard({
  std,
  status,
  selected,
  onClick,
}: {
  std: (typeof ISO_STANDARDS)[number]
  status: StandardComplianceStatus
  selected: boolean
  onClick: () => void
}) {
  const compliantPct = Math.round((status.controls_compliant / status.controls_total) * 100)

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'island-shell rounded-2xl p-4 text-left transition',
        selected ? 'ring-2' : 'hover:brightness-105',
      ].join(' ')}
      style={selected ? { ringColor: std.color } : undefined}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
          style={{ background: `${std.color}18`, color: std.color }}
        >
          {std.id}
        </span>
        <SeverityBadge severity={status.drift_severity} />
      </div>
      <p className="mb-0.5 text-sm font-semibold text-[var(--sea-ink)]">{std.title}</p>
      <p className="mb-3 text-xs text-[var(--sea-ink-soft)]">{std.description}</p>

      {/* Score bar */}
      <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${compliantPct}%`, background: std.color }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--sea-ink-soft)]">
          {status.controls_compliant}/{status.controls_total} controls
        </span>
        <span className="font-mono font-semibold" style={{ color: std.color }}>
          {compliantPct}%
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#4fb8b2]" />
        <span className="font-mono text-[9px] text-[var(--sea-ink-soft)]">
          Agent: {std.agent}
        </span>
      </div>
    </button>
  )
}

function DetailPanel({ status }: { status: StandardComplianceStatus }) {
  const std = ISO_STANDARDS.find((s) => s.id === status.standard_id)!
  return (
    <div className="island-shell rounded-2xl p-5">
      <p className="island-kicker mb-1">{status.standard_id}</p>
      <h3 className="mb-4 text-base font-bold text-[var(--sea-ink)]">{std.title}</h3>
      <dl className="space-y-3 text-sm">
        <DetailRow label="Score" value={`${status.score}%`} color={std.color} />
        <DetailRow label="Controls" value={`${status.controls_total} total`} />
        <DetailRow label="Compliant" value={String(status.controls_compliant)} color="#4fb8b2" />
        <DetailRow label="Partial" value={String(status.controls_partial)} color="#ff9500" />
        <DetailRow label="Failing" value={String(status.controls_failing)} color="#ff4444" />
        <DetailRow label="Drift" value={status.drift_severity} color={severityColor(status.drift_severity)} />
        <DetailRow label="Cert ready" value={status.certification_ready ? 'Yes' : 'No'} color={status.certification_ready ? '#4fb8b2' : '#ff4444'} />
        <DetailRow label="Agent" value={std.agent} />
        <DetailRow label="Next check" value={new Date(status.next_check).toLocaleTimeString()} />
      </dl>
    </div>
  )
}

function SummaryPanel({ report }: { report: ComplianceReport }) {
  const compliant = report.standards.filter((s) => s.overall_status === 'compliant').length
  const partial = report.standards.filter((s) => s.overall_status === 'partial').length
  const failing = report.standards.filter((s) => s.overall_status === 'non_compliant').length

  return (
    <div className="island-shell rounded-2xl p-5">
      <p className="island-kicker mb-3">Compliance Summary</p>
      <dl className="space-y-3 text-sm">
        <DetailRow label="Standards" value="8 active" />
        <DetailRow label="Compliant" value={String(compliant)} color="#4fb8b2" />
        <DetailRow label="Partial" value={String(partial)} color="#ff9500" />
        <DetailRow label="Failing" value={String(failing)} color="#ff4444" />
        <DetailRow label="Overall" value={`${report.overall_score}%`} color={report.overall_score >= 90 ? '#4fb8b2' : '#ff9500'} />
        <DetailRow label="Violations" value={String(report.active_violations.length)} color={report.active_violations.length > 0 ? '#ff4444' : '#4fb8b2'} />
        <DetailRow label="Drift alerts" value={String(report.drift_alerts.length)} color={report.drift_alerts.length > 0 ? '#ff9500' : '#4fb8b2'} />
      </dl>

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <p className="island-kicker mb-2">Responsible Agents</p>
        <div className="flex flex-wrap gap-1.5">
          {['judge-luci', 'claude-veritas', 'aethon', 'cortana', 'juniper', 'lucia'].map((agent) => (
            <span
              key={agent}
              className="rounded-lg border border-[var(--line)] px-2 py-1 font-mono text-[10px] text-[var(--sea-ink-soft)]"
            >
              {agent}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-[var(--sea-ink-soft)]">
        Select a standard for details
      </p>
    </div>
  )
}

function ViolationRow({ violation }: { violation: ComplianceReport['active_violations'][number] }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
      style={{ borderColor: `${severityColor(violation.severity)}33` }}
    >
      <span
        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: severityColor(violation.severity) }}
      />
      <div className="flex-1">
        <span className="font-mono text-xs font-semibold" style={{ color: severityColor(violation.severity) }}>
          {violation.severity.toUpperCase()}
        </span>
        {' · '}
        <span className="text-[var(--sea-ink-soft)]">{violation.standard_id} / {violation.control_id}</span>
        <p className="mt-0.5 text-[var(--sea-ink)]">{violation.description}</p>
        <p className="mt-0.5 text-xs text-[var(--sea-ink-soft)]">Assigned: {violation.agent_assigned}</p>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px]"
        style={{
          background: violation.status === 'resolved' ? 'rgba(79,184,178,0.12)' : 'rgba(255,107,53,0.12)',
          color: violation.status === 'resolved' ? '#4fb8b2' : '#ff6b35',
        }}
      >
        {violation.status.toUpperCase()}
      </span>
    </div>
  )
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="shrink-0 text-[var(--sea-ink-soft)]">{label}</dt>
      <dd className="m-0 font-mono text-xs font-semibold" style={{ color: color ?? 'var(--sea-ink)' }}>
        {value}
      </dd>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: DriftSeverity }) {
  if (severity === 'none') return null
  return (
    <span
      className="rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase"
      style={{ background: `${severityColor(severity)}18`, color: severityColor(severity) }}
    >
      {severity}
    </span>
  )
}
