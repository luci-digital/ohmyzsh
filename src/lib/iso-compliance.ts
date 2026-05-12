// ISO compliance types — 8 standards covering the LuciVerse platform
// Manifest source: iso-compliance/ISO-COMPLIANCE-MANIFEST.yaml
// Agents responsible: Claude-Veritas (A.6.1 verification), Judge Luci (A.6.1 governance)

export const ISO_STANDARDS = [
  {
    id: 'ISO-27001',
    title: 'Information Security Management',
    version: '2022',
    controls: 114,
    color: '#4fb8b2',
    agent: 'claude-veritas',
    description: 'ISMS — encryption, access control, incident management',
  },
  {
    id: 'ISO-27018',
    title: 'Cloud Privacy Protection',
    version: '2019',
    controls: 34,
    color: '#7c5cbf',
    agent: 'lucia',
    description: 'PII processing in public cloud — consent, transparency, portability',
  },
  {
    id: 'ISO-20022',
    title: 'Financial Services Messaging',
    version: '2022',
    controls: 150,
    color: '#ff9500',
    agent: 'juniper',
    description: 'Message types for payments, securities, trade finance',
  },
  {
    id: 'ISO-23894',
    title: 'AI Risk Management',
    version: '2023',
    controls: 45,
    color: '#ff6b35',
    agent: 'judge-luci',
    description: 'Risk identification, analysis, and treatment for AI systems',
  },
  {
    id: 'ISO-9001',
    title: 'Quality Management Systems',
    version: '2015',
    controls: 89,
    color: '#00d4ff',
    agent: 'aethon',
    description: 'Process quality, documentation, continuous improvement',
  },
  {
    id: 'ISO-IEC-23053',
    title: 'Machine Learning Framework',
    version: '2022',
    controls: 67,
    color: '#ff2d78',
    agent: 'cortana',
    description: 'ML system lifecycle, training data governance, deployment',
  },
  {
    id: 'ISO-IEC-22989',
    title: 'AI Concepts and Terminology',
    version: '2022',
    controls: 234,
    color: '#00ff9d',
    agent: 'claude-veritas',
    description: 'Canonical AI definitions — ensures terminology consistency',
  },
  {
    id: 'ISO-IEC-24029',
    title: 'Neural Network Robustness',
    version: '2021',
    controls: 78,
    color: '#9370db',
    agent: 'cortana',
    description: 'Formal methods for robustness assessment of neural networks',
  },
] as const

export type IsoStandardId = (typeof ISO_STANDARDS)[number]['id']

export type ControlStatus = 'compliant' | 'non_compliant' | 'partial' | 'pending' | 'not_applicable'

export type DriftSeverity = 'critical' | 'high' | 'medium' | 'low' | 'none'

export interface ControlResult {
  id: string
  title: string
  status: ControlStatus
  evidence?: string
  last_checked: number
  agent_responsible: string
}

export interface StandardComplianceStatus {
  standard_id: IsoStandardId
  overall_status: ControlStatus
  score: number               // 0–100
  controls_total: number
  controls_compliant: number
  controls_partial: number
  controls_failing: number
  drift_severity: DriftSeverity
  last_audit: number
  next_check: number
  certification_ready: boolean
  controls?: ControlResult[]
}

export interface ComplianceReport {
  generated_at: number
  overall_score: number
  certification_readiness: number // 0–100
  standards: StandardComplianceStatus[]
  active_violations: ComplianceViolation[]
  drift_alerts: DriftAlert[]
  genesis_bond_coherence: number
}

export interface ComplianceViolation {
  id: string
  standard_id: IsoStandardId
  control_id: string
  severity: DriftSeverity
  description: string
  detected_at: number
  agent_assigned: string
  status: 'open' | 'remediation' | 'resolved'
}

export interface DriftAlert {
  id: string
  standard_id: IsoStandardId
  message: string
  severity: DriftSeverity
  detected_at: number
  auto_remediation: boolean
}

// Stub report — used when backend is unreachable
export function stubComplianceReport(): ComplianceReport {
  const now = Date.now()
  return {
    generated_at: now,
    overall_score: 95,
    certification_readiness: 95,
    genesis_bond_coherence: 0.94,
    standards: ISO_STANDARDS.map((s) => ({
      standard_id: s.id,
      overall_status: 'compliant',
      score: 95,
      controls_total: s.controls,
      controls_compliant: Math.floor(s.controls * 0.95),
      controls_partial: Math.floor(s.controls * 0.04),
      controls_failing: Math.floor(s.controls * 0.01),
      drift_severity: 'low',
      last_audit: now - 86400000,
      next_check: now + 3600000,
      certification_ready: true,
    })),
    active_violations: [],
    drift_alerts: [
      {
        id: 'da-001',
        standard_id: 'ISO-27001',
        message: 'Audit log retention approaching 2555-day threshold on node d8rth',
        severity: 'low',
        detected_at: now - 3600000,
        auto_remediation: true,
      },
    ],
  }
}

export function severityColor(s: DriftSeverity): string {
  return { critical: '#ff4444', high: '#ff6b35', medium: '#ff9500', low: '#ffcc00', none: '#4fb8b2' }[s]
}

export function statusColor(s: ControlStatus): string {
  return { compliant: '#4fb8b2', partial: '#ff9500', non_compliant: '#ff4444', pending: '#667788', not_applicable: '#333' }[s]
}
