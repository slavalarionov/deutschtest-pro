export type PraedikatLevel =
  | 'sehr_gut'
  | 'gut'
  | 'befriedigend'
  | 'ausreichend'
  | 'nicht_bestanden'

export interface Praedikat {
  level: PraedikatLevel
  /** Official Goethe label in German, e.g. "sehr gut". */
  labelDe: string
  /** CSS variable expression suitable for inline `style` or `border-color`. */
  cssColor: string
  /** Frozen sRGB hex matching `cssColor` in the light theme — used for OG. */
  ogHex: string
  passed: boolean
}

const SEHR_GUT: Praedikat = {
  level: 'sehr_gut',
  labelDe: 'sehr gut',
  cssColor: 'var(--success)',
  ogHex: '#14874e',
  passed: true,
}

const GUT: Praedikat = {
  level: 'gut',
  labelDe: 'gut',
  cssColor: 'var(--success-mid)',
  ogHex: '#708c34',
  passed: true,
}

const BEFRIEDIGEND: Praedikat = {
  level: 'befriedigend',
  labelDe: 'befriedigend',
  cssColor: 'var(--warn-mid)',
  ogHex: '#b49600',
  passed: true,
}

const AUSREICHEND: Praedikat = {
  level: 'ausreichend',
  labelDe: 'ausreichend',
  cssColor: 'var(--warn)',
  ogHex: '#bd8630',
  passed: true,
}

const NICHT_BESTANDEN: Praedikat = {
  level: 'nicht_bestanden',
  labelDe: 'nicht bestanden',
  cssColor: 'var(--error)',
  ogHex: '#b63039',
  passed: false,
}

export function getPraedikat(score: number): Praedikat {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0
  if (s >= 90) return SEHR_GUT
  if (s >= 80) return GUT
  if (s >= 70) return BEFRIEDIGEND
  if (s >= 60) return AUSREICHEND
  return NICHT_BESTANDEN
}
