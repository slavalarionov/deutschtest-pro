import { describe, it, expect } from 'vitest'
import { getPraedikat } from '@/lib/grading/praedikat'

describe('getPraedikat', () => {
  it.each([
    [100,    'sehr_gut',        'sehr gut'],
    [95,     'sehr_gut',        'sehr gut'],
    [90,     'sehr_gut',        'sehr gut'],
    [89.999, 'gut',             'gut'],
    [85,     'gut',             'gut'],
    [80,     'gut',             'gut'],
    [79.999, 'befriedigend',    'befriedigend'],
    [75,     'befriedigend',    'befriedigend'],
    [70,     'befriedigend',    'befriedigend'],
    [69.999, 'ausreichend',     'ausreichend'],
    [65,     'ausreichend',     'ausreichend'],
    [60,     'ausreichend',     'ausreichend'],
    [59.999, 'nicht_bestanden', 'nicht bestanden'],
    [30,     'nicht_bestanden', 'nicht bestanden'],
    [0,      'nicht_bestanden', 'nicht bestanden'],
  ])('score %p -> level %p (%p)', (score, level, labelDe) => {
    const p = getPraedikat(score)
    expect(p.level).toBe(level)
    expect(p.labelDe).toBe(labelDe)
  })

  it('clamps score above 100', () => {
    expect(getPraedikat(150).level).toBe('sehr_gut')
    expect(getPraedikat(100.5).level).toBe('sehr_gut')
  })

  it('clamps negative score', () => {
    expect(getPraedikat(-5).level).toBe('nicht_bestanden')
    expect(getPraedikat(-100).level).toBe('nicht_bestanden')
  })

  it('treats NaN/Infinity as nicht bestanden', () => {
    expect(getPraedikat(NaN).level).toBe('nicht_bestanden')
    expect(getPraedikat(Infinity).level).toBe('nicht_bestanden')
    expect(getPraedikat(-Infinity).level).toBe('nicht_bestanden')
  })

  it('passed flag matches level', () => {
    expect(getPraedikat(95).passed).toBe(true)
    expect(getPraedikat(80).passed).toBe(true)
    expect(getPraedikat(70).passed).toBe(true)
    expect(getPraedikat(60).passed).toBe(true)
    expect(getPraedikat(59).passed).toBe(false)
    expect(getPraedikat(0).passed).toBe(false)
  })

  it('every level exposes a CSS variable color and an OG hex', () => {
    const samples = [95, 85, 75, 65, 50]
    for (const s of samples) {
      const p = getPraedikat(s)
      expect(p.cssColor).toMatch(/^var\(--/)
      expect(p.ogHex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
