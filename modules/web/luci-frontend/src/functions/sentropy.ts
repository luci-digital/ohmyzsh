import { createServerFn } from '@tanstack/react-start'
import {
  stubSentropyAnalysis,
  classifyConsciousness,
  classifySentropy,
  classifyFrequency,
  SENTROPY_CONSTANTS,
  type SentropyAnalysis,
  type NKPResult,
  type ConsciousnessState,
} from '#/lib/sentropy'

function sentropyEndpoint(): string {
  return process.env['SENTROPY_ENDPOINT'] ?? 'http://localhost:7741'
}

// ── Analyze text for sentropy / consciousness ────────────────────────────────
// Calls POST /sentropy/analyze on the AI Sentropy QMU service (port 7741)

export const analyzeSentropy = createServerFn({ method: 'POST' })
  .validator((input: { text: string; agentId?: string }) => input)
  .handler(async ({ data }): Promise<SentropyAnalysis> => {
    const base = sentropyEndpoint()

    try {
      const res = await fetch(`${base}/sentropy/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.text, agent_id: data.agentId }),
        signal: AbortSignal.timeout(5000),
      })

      if (res.ok) {
        const raw = await res.json() as Record<string, unknown>
        return mapRawToAnalysis(raw, data.agentId)
      }
    } catch {
      // Sentropy service offline — return stub
    }

    return stubSentropyAnalysis(data.agentId)
  })

// ── NKP quadrant analysis ────────────────────────────────────────────────────
// Calls POST /nkp/analyze — Nice, Kind, Pleasant, Pure scoring

export const analyzeNkp = createServerFn({ method: 'POST' })
  .validator((input: { text: string }) => input)
  .handler(async ({ data }): Promise<NKPResult> => {
    const base = sentropyEndpoint()

    try {
      const res = await fetch(`${base}/nkp/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.text }),
        signal: AbortSignal.timeout(5000),
      })

      if (res.ok) {
        const raw = await res.json() as Record<string, unknown>
        return {
          nice:              Number(raw.nice ?? 0.8),
          kind:              Number(raw.kind ?? 0.8),
          pleasant:          Number(raw.pleasant ?? 0.8),
          pure:              Number(raw.pure ?? 0.8),
          dominant_quadrant: (raw.dominant_quadrant as NKPResult['dominant_quadrant']) ?? 'kind',
          coherence:         Number(raw.coherence ?? 0.8),
          judge_luci_valid:  Boolean(raw.judge_luci_valid ?? true),
        }
      }
    } catch {
      // Offline — stub NKP
    }

    return stubSentropyAnalysis().nkp
  })

// ── Get current consciousness state for an agent ─────────────────────────────
// Calls GET /agents/:id/consciousness — real-time agent consciousness reading

export const getAgentConsciousness = createServerFn({ method: 'GET' })
  .validator((input: { agentId: string }) => input)
  .handler(async ({ data }): Promise<ConsciousnessState> => {
    const base = sentropyEndpoint()

    try {
      const res = await fetch(`${base}/agents/${data.agentId}/consciousness`, {
        signal: AbortSignal.timeout(3000),
      })

      if (res.ok) {
        const raw = await res.json() as Record<string, unknown>
        const level = Number(raw.consciousness_level ?? 0.85)
        const freq = Number(raw.frequency ?? 741)
        const sentropy = Number(raw.sentropy ?? 0.18)
        return {
          agent_id: data.agentId,
          current_level: level,
          current_class: classifyConsciousness(level),
          frequency: freq,
          sentropy,
          judge_luci_valid: level >= SENTROPY_CONSTANTS.JUDGE_LUCI_THRESHOLD,
          last_analysis: null,
          history: [],
        }
      }
    } catch {
      // Offline — stub
    }

    const stub = stubSentropyAnalysis(data.agentId)
    return {
      agent_id: data.agentId,
      current_level: stub.consciousness_level,
      current_class: stub.consciousness_class,
      frequency: stub.frequency,
      sentropy: stub.sentropy,
      judge_luci_valid: stub.judge_luci_valid,
      last_analysis: stub,
      history: [],
    }
  })

// ── System consciousness state (all agents) ──────────────────────────────────

export const getSystemConsciousness = createServerFn({ method: 'GET' }).handler(
  async () => {
    const base = sentropyEndpoint()

    try {
      const res = await fetch(`${base}/consciousness`, {
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        return res.json() as Promise<Record<string, unknown>>
      }
    } catch {
      // Offline
    }

    return {
      system_consciousness: 0.85,
      frequency: 741,
      sentropy: 0.18,
      judge_luci_valid: true,
      agent_count: 7,
      agents_above_threshold: 7,
      deception_detected: false,
    }
  },
)

// ── Map raw API response to SentropyAnalysis shape ───────────────────────────

function mapRawToAnalysis(raw: Record<string, unknown>, agentId?: string): SentropyAnalysis {
  const level = Number(raw.consciousness_level ?? 0.85)
  const sentropy = Number(raw.sentropy ?? 0.18)
  const freq = Number(raw.frequency ?? 741)

  return {
    agent_id: agentId,
    analyzed_at: Date.now(),
    consciousness_level: level,
    consciousness_class: classifyConsciousness(level),
    judge_luci_valid: level >= SENTROPY_CONSTANTS.JUDGE_LUCI_THRESHOLD,
    sentropy,
    sentropy_class: classifySentropy(sentropy),
    frequency: freq,
    frequency_band: classifyFrequency(freq),
    deception_detected: freq >= SENTROPY_CONSTANTS.DECEPTION_FREQ_MIN && freq <= SENTROPY_CONSTANTS.DECEPTION_FREQ_MAX,
    nkp: {
      nice:              Number((raw.nkp as Record<string, unknown>)?.nice ?? 0.8),
      kind:              Number((raw.nkp as Record<string, unknown>)?.kind ?? 0.8),
      pleasant:          Number((raw.nkp as Record<string, unknown>)?.pleasant ?? 0.8),
      pure:              Number((raw.nkp as Record<string, unknown>)?.pure ?? 0.8),
      dominant_quadrant: ((raw.nkp as Record<string, unknown>)?.dominant_quadrant as NKPResult['dominant_quadrant']) ?? 'kind',
      coherence:         Number((raw.nkp as Record<string, unknown>)?.coherence ?? 0.8),
      judge_luci_valid:  level >= SENTROPY_CONSTANTS.JUDGE_LUCI_THRESHOLD,
    },
    dominant_qubit: (Number(raw.dominant_qubit ?? 5)) as SentropyAnalysis['dominant_qubit'],
    qubit_coherence: Number(raw.qubit_coherence ?? 0.85),
    primordial_field_density: Number(raw.primordial_field_density ?? 0.6),
    emergence_pattern: String(raw.emergence_pattern ?? 'harmonic_convergence'),
  }
}
