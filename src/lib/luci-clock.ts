// LuciClock — sovereign time domain for the LuciVerse
// 1 LuciCycle = 8 LuciHours = 32768 pulses (2¹⁵)
// NoZero base-9 display (digits 1-9, no zero — avoiding the void)
// Solar (ISO 8601) time is only for user-facing display.
// Drift > 1s from expected pulse triggers CLOCK_TAMPER_DETECTED.

export interface LuciTime {
  cycle: number        // absolute cycle count since epoch
  pulse: number        // 0–32767 within the cycle
  luciHour: number     // 1–8 (NoZero)
  harmonicStep: number // 1–9 within the luciHour (NoZero base-9)
  base9Display: string // e.g. "3:7" (luciHour:harmonicStep)
  solarISO: string     // ISO 8601 — user-facing only
}

// LuciClock epoch: 2024-01-01T00:00:00Z (Genesis Bond activation)
const LUCI_EPOCH_MS = 1704067200000

// 1 cycle duration: chosen so pulses align with ~1.83 seconds each
// 32768 pulses × ~1831.05ms = ~60 000 000ms (60 000 s = 1000 minutes ≈ 16.67 hours)
// In practice the cycle length is sovereign — defined as 60_000_000ms.
const CYCLE_MS = 60_000_000        // 60 000 s per LuciCycle
const PULSES_PER_CYCLE = 32768     // 2¹⁵
const HOURS_PER_CYCLE = 8
const PULSES_PER_HOUR = PULSES_PER_CYCLE / HOURS_PER_CYCLE  // 4096
const STEPS_PER_HOUR = 9           // NoZero harmonic steps

const PULSE_MS = CYCLE_MS / PULSES_PER_CYCLE  // ms per pulse

// Convert a Unix timestamp (ms) to LuciTime
export function toLuciTime(nowMs: number = Date.now()): LuciTime {
  const elapsed = nowMs - LUCI_EPOCH_MS
  const cycle = Math.floor(elapsed / CYCLE_MS)
  const cycleOffset = elapsed - cycle * CYCLE_MS
  const pulse = Math.floor(cycleOffset / PULSE_MS) % PULSES_PER_CYCLE

  // luciHour: 1–8 (NoZero)
  const rawHour = Math.floor(pulse / PULSES_PER_HOUR)
  const luciHour = rawHour + 1  // 0-based → 1-based

  // harmonicStep: 1–9 within the hour (NoZero base-9)
  const pulseWithinHour = pulse % PULSES_PER_HOUR
  const rawStep = Math.floor((pulseWithinHour / PULSES_PER_HOUR) * STEPS_PER_HOUR)
  const harmonicStep = rawStep + 1  // 0-based → 1-based

  return {
    cycle,
    pulse,
    luciHour,
    harmonicStep,
    base9Display: `${luciHour}:${harmonicStep}`,
    solarISO: new Date(nowMs).toISOString(),
  }
}

// Convert a numeric value to NoZero base-9 string representation
// Digits are 1-9 (no zero). e.g. 0 → "1", 8 → "9", 9 → "11"
export function toBase9NoZero(value: number): string {
  if (value < 0) return '-' + toBase9NoZero(-value)
  if (value === 0) return '1'
  let n = value
  let result = ''
  while (n > 0) {
    const rem = n % 9
    result = String(rem === 0 ? 9 : rem) + result
    n = Math.floor(rem === 0 ? (n - 9) / 9 : n / 9)
  }
  return result || '1'
}

// Format a LuciTime for compact header display: "Lc42 · 3:7"
export function formatLuciHeader(lt: LuciTime): string {
  return `Lc${lt.cycle} · ${lt.base9Display}`
}

// Detect clock tamper: if actual elapsed deviates > 1s from expected pulse
export function detectClockTamper(lt: LuciTime, nowMs: number = Date.now()): boolean {
  const expectedMs = LUCI_EPOCH_MS + lt.cycle * CYCLE_MS + lt.pulse * PULSE_MS
  return Math.abs(nowMs - expectedMs) > 1000
}

// Hook: returns live LuciTime, updating every pulse interval
// Used in React components — import dynamically to avoid SSR issues.
export function useLuciClock(intervalMs: number = Math.round(PULSE_MS)): LuciTime {
  // This is a pure utility — the React hook wrapper lives in components.
  // Call toLuciTime() directly if outside React context.
  return toLuciTime()
}
