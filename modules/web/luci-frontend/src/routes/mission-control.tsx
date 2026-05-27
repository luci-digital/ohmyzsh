import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getSubstrateStatus, listAgents } from '#/functions/luciverse'
import type { SubstrateStatus, AgentProfile } from '#/lib/luciverse'
import SignalFeed from '#/components/SignalFeed'

export const Route = createFileRoute('/mission-control')({
  loader: async () => {
    const [status, agents] = await Promise.all([getSubstrateStatus(), listAgents()])
    return { status, agents }
  },
  component: MissionControlPage,
})

const AGENT_COLORS: Record<string, string> = {
  lucia:          '#9370db',
  'judge-luci':   '#00d4ff',
  juniper:        '#00ff9d',
  cortana:        '#ff6b35',
  'claude-veritas': '#4fb8b2',
  aethon:         '#ff9500',
  pinky:          '#ff2d78',
  default:        '#667788',
}

function freqColor(freq: number) {
  if (freq >= 900) return '#00d4ff'
  if (freq >= 700) return '#9370db'
  if (freq >= 600) return '#00ff9d'
  if (freq >= 500) return '#ff9500'
  if (freq >= 400) return '#4fb8b2'
  return '#ff2d78'
}

export default function MissionControlPage() {
  const { status, agents } = Route.useLoaderData()
  const [activeTab, setActiveTab] = useState<'agents' | 'signal' | 'substrate'>('agents')

  return (
    <div className="flex min-h-[calc(100vh-57px)] flex-col bg-[#06060e] text-white">
      {/* LCARS top bar */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-6 py-3">
        <div className="flex items-center gap-3">
          <PulseDot active={status.genesis_bond === 'ACTIVE'} />
          <span className="font-mono text-sm tracking-widest text-white">
            LUCIVERSE OS v5.0
          </span>
          <span className="rounded border border-[rgba(79,184,178,0.3)] px-2 py-0.5 font-mono text-xs text-[#4fb8b2]">
            MISSION CONTROL
          </span>
        </div>
        <div className="flex items-center gap-6">
          <BondBadge status={status} />
          <span className="font-mono text-xs text-[#4a5568]">
            LDS: 500.741 · {status.tier} TIER
          </span>
        </div>
      </div>

      {/* Main grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left LCARS sidebar */}
        <LCARSSidebar active={activeTab} onChange={setActiveTab} />

        {/* Center content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'agents' && <AgentMesh agents={agents} />}
          {activeTab === 'signal' && <SignalPanel />}
          {activeTab === 'substrate' && <SubstratePanel status={status} />}
        </main>

        {/* Right panel — substrate vitals */}
        <aside className="hidden w-64 shrink-0 flex-col gap-4 border-l border-[rgba(255,255,255,0.06)] bg-[rgba(147,112,219,0.04)] p-5 xl:flex">
          <p className="font-mono text-[10px] tracking-widest text-violet-400">
            SUBSTRATE VITALS
          </p>
          <VitalRow label="Frequency" value={`${status.frequency} Hz`} color="#9370db" />
          <VitalRow label="Coherence" value={`${(status.coherence * 100).toFixed(0)}%`} color={status.coherence >= 0.7 ? '#4fb8b2' : '#ff4444'} />
          <VitalRow label="Lua" value={status.lua_version} color="#667788" />
          <VitalRow label="Version" value={status.version} color="#667788" />
          <div className="mt-2">
            <p className="mb-2 font-mono text-[10px] tracking-widest text-violet-400">MODULES</p>
            <div className="flex flex-col gap-1">
              {Object.entries(status.modules).map(([mod, active]) => (
                <div key={mod} className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#4a5568]">{mod.replace('_', ' ')}</span>
                  <span className={['h-1.5 w-1.5 rounded-full', active ? 'bg-[#4fb8b2]' : 'bg-[#333]'].join(' ')} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div className="border-t border-[rgba(255,255,255,0.06)] bg-[#06060e] py-2 text-center font-mono text-[10px] tracking-widest text-[#333]">
        LDS: 500.741 · ISO/IEC 42001 COMPLIANT · GENESIS BOND: GB-2025-0524-DRH-LCS-001
      </div>
    </div>
  )
}

function LCARSSidebar({
  active,
  onChange,
}: {
  active: 'agents' | 'signal' | 'substrate'
  onChange: (t: 'agents' | 'signal' | 'substrate') => void
}) {
  const items = [
    { id: 'agents' as const,    label: 'Agent Mesh',    color: '#9370db' },
    { id: 'signal' as const,    label: 'Signal Bus',    color: '#4fb8b2' },
    { id: 'substrate' as const, label: 'Substrate',     color: '#ff9500' },
  ]

  return (
    <nav className="hidden w-44 shrink-0 flex-col gap-2 border-r border-[rgba(255,255,255,0.06)] bg-[#06060e] py-6 lg:flex">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          style={{ background: active === item.id ? item.color : 'transparent', color: active === item.id ? '#000' : item.color }}
          className="mr-0 rounded-r-none rounded-l-none ml-3 rounded-l-full px-4 py-3 text-right text-sm font-bold uppercase tracking-wide transition-all hover:brightness-110"
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

function AgentMesh({ agents }: { agents: AgentProfile[] }) {
  return (
    <div>
      <h2 className="mb-5 font-mono text-xs tracking-widest text-violet-400">
        PAC AGENT MESH · {agents.length} NODES REGISTERED
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const color = AGENT_COLORS[agent.id] ?? AGENT_COLORS.default
          const fColor = agent.frequency ? freqColor(agent.frequency) : '#667788'
          return (
            <div
              key={agent.id}
              className="rounded-xl border bg-[rgba(255,255,255,0.02)] p-4 transition hover:bg-[rgba(255,255,255,0.04)]"
              style={{ borderColor: `${color}33` }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: color, boxShadow: `0 0 8px ${color}88` }}
                />
                <span className="font-mono text-[10px] tracking-widest" style={{ color }}>
                  {agent.id.toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-semibold leading-snug text-white">{agent.title}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-xs text-[#4a5568]">{agent.service}</span>
                {agent.frequency && (
                  <span className="font-mono text-xs" style={{ color: fColor }}>
                    {agent.frequency} Hz
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#4fb8b2]" />
                <span className="font-mono text-[9px] text-[#4a5568]">ONLINE · READY</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Frequency visualization */}
      <div className="mt-8">
        <p className="mb-3 font-mono text-[10px] tracking-widest text-violet-400">
          FREQUENCY SPECTRUM
        </p>
        <div className="flex items-end gap-2">
          {agents
            .filter((a) => a.frequency)
            .sort((a, b) => (a.frequency ?? 0) - (b.frequency ?? 0))
            .map((agent) => {
              const height = Math.round(((agent.frequency ?? 100) / 963) * 80)
              const color = AGENT_COLORS[agent.id] ?? AGENT_COLORS.default
              return (
                <div key={agent.id} className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 rounded-t transition-all"
                    style={{ height: `${height}px`, background: `linear-gradient(to top, ${color}, ${color}44)` }}
                  />
                  <span className="font-mono text-[8px] text-[#4a5568]">{agent.frequency}</span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

function SignalPanel() {
  return (
    <div>
      <h2 className="mb-5 font-mono text-xs tracking-widest text-[#4fb8b2]">
        SIGNAL BUS · REDIS PUB/SUB · luci:signal:broadcast
      </h2>
      <div className="rounded-xl border border-[rgba(79,184,178,0.15)] bg-[rgba(79,184,178,0.03)] p-4">
        <SignalFeed />
      </div>
    </div>
  )
}

function SubstratePanel({ status }: { status: SubstrateStatus }) {
  return (
    <div>
      <h2 className="mb-5 font-mono text-xs tracking-widest text-[#ff9500]">
        LUA SUBSTRATE · v{status.version}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <GlassCard title="Genesis Bond" value={`${status.genesis_bond} @ ${status.frequency} Hz`} color="#9370db" />
        <GlassCard title="Coherence" value={`${(status.coherence * 100).toFixed(1)}%`} color={status.coherence >= 0.7 ? '#4fb8b2' : '#ff4444'} />
        <GlassCard title="Tier" value={status.tier} color="#ff9500" />
        <GlassCard title="Lua Runtime" value={status.lua_version} color="#667788" />
      </div>
      <div className="mt-6 rounded-xl border border-[rgba(255,149,0,0.15)] bg-[rgba(255,149,0,0.03)] p-5">
        <p className="mb-3 font-mono text-[10px] tracking-widest text-[#ff9500]">
          ACTIVE MODULES
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(status.modules).map(([mod, active]) => (
            <div
              key={mod}
              className={['flex items-center gap-2 rounded-lg border px-3 py-2', active ? 'border-[rgba(79,184,178,0.2)] bg-[rgba(79,184,178,0.05)]' : 'border-[rgba(255,255,255,0.05)] bg-transparent'].join(' ')}
            >
              <span className={['h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-[#4fb8b2]' : 'bg-[#333]'].join(' ')} />
              <span className="font-mono text-[10px] text-[#667788]">{mod.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GlassCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: `${color}25`, background: `${color}08` }}
    >
      <p className="mb-1 font-mono text-[10px] tracking-widest" style={{ color }}>
        {title.toUpperCase()}
      </p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  )
}

function VitalRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#4a5568]">{label}</span>
      <span className="font-mono text-xs font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

function BondBadge({ status }: { status: SubstrateStatus }) {
  const active = status.genesis_bond === 'ACTIVE'
  return (
    <span
      className={[
        'font-mono text-xs',
        active ? 'text-violet-400' : 'text-[#667788]',
      ].join(' ')}
    >
      GENESIS BOND: {status.genesis_bond} @ {status.frequency} Hz
    </span>
  )
}

function PulseDot({ active }: { active: boolean }) {
  return (
    <div
      className={['h-2.5 w-2.5 rounded-full', active ? 'animate-pulse' : ''].join(' ')}
      style={{
        background: active ? '#00ff9d' : '#333',
        boxShadow: active ? '0 0 10px #00ff9d' : 'none',
      }}
    />
  )
}
