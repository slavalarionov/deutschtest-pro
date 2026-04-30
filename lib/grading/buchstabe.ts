export type Buchstabe = 'A' | 'B' | 'C' | 'D' | 'E'

export interface BuchstabeResult {
  letter: Buchstabe
  cssColor: string
}

const A: BuchstabeResult = { letter: 'A', cssColor: 'var(--success)' }
const B: BuchstabeResult = { letter: 'B', cssColor: 'var(--success-mid)' }
const C: BuchstabeResult = { letter: 'C', cssColor: 'var(--warn-mid)' }
const D: BuchstabeResult = { letter: 'D', cssColor: 'var(--warn)' }
const E: BuchstabeResult = { letter: 'E', cssColor: 'var(--error)' }

export function getBuchstabe(score: number, max: number): BuchstabeResult {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return E
  const clamped = Math.max(0, Math.min(max, score))
  const pct = (clamped / max) * 100
  if (pct >= 90) return A
  if (pct >= 75) return B
  if (pct >= 60) return C
  if (pct >= 40) return D
  return E
}
