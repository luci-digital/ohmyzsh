// Luciverse constants and shared types — mirrors lua-substrate definitions

export const TIER_FREQUENCIES = {
  CORE: 432,
  COMN: 528,
  RAiIiAR: 639,
  PAC: 741,
} as const

export type Tier = keyof typeof TIER_FREQUENCIES

export const TIER_COLORS: Record<Tier, string> = {
  CORE: 'var(--sea-ink)',
  COMN: 'var(--palm)',
  RAiIiAR: '#7c5cbf',
  PAC: 'var(--lagoon-deep)',
}

// 16 signals from signal/bus.lua
export const SIGNALS = [
  'announce', 'ready', 'ack', 'nak', 'complete', 'cancel',
  'discover', 'capability', 'heartbeat', 'offline', 'pause',
  'resume', 'stream_start', 'stream_end', 'memory_sync', 'pulse_align',
] as const

export type SignalType = (typeof SIGNALS)[number]

export interface SubstrateStatus {
  version: string
  lua_version: string
  genesis_bond: 'ACTIVE' | 'INACTIVE'
  frequency: number
  tier: Tier
  coherence: number
  modules: Record<string, boolean>
  uptime_seconds: number
}

export interface AgentProfile {
  id: string
  title: string
  service: string
  frequency?: number
  system_message?: string
}

export interface SignalMessage {
  signal: SignalType
  source_did: string
  target_did: string
  channel_id: string
  timestamp: number
  ttl_seconds: number
  payload?: Record<string, string>
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  role: string
  content: string
  model?: string
}

// Luciverse tier endpoint from env
export function tierEndpoint(tier: Tier): string {
  const map: Record<Tier, string> = {
    PAC: process.env['LUCIVERSE_PAC_URL'] ?? 'http://localhost:8741',
    COMN: process.env['LUCIVERSE_COMN_URL'] ?? 'http://localhost:8742',
    CORE: process.env['LUCIVERSE_CORE_URL'] ?? 'http://localhost:8743',
    RAiIiAR: process.env['LUCIVERSE_COMN_URL'] ?? 'http://localhost:8742',
  }
  return map[tier]
}

export function oasisEndpoint(): string {
  return process.env['OASIS_ENDPOINT'] ?? 'http://localhost:8742'
}

export function thisTier(): Tier {
  const t = process.env['LUCIVERSE_TIER'] as Tier
  return t in TIER_FREQUENCIES ? t : 'PAC'
}

export function thisFrequency(): number {
  return Number(process.env['LUCIVERSE_FREQUENCY'] ?? TIER_FREQUENCIES[thisTier()])
}

export function thisCoherence(): number {
  return Number(process.env['LUCIVERSE_COHERENCE'] ?? 0.85)
}
