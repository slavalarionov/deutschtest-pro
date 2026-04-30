import { describe, it, expect } from 'vitest'
import { getBuchstabe } from '@/lib/grading/buchstabe'

describe('getBuchstabe — max 25 (Schreiben criteria)', () => {
  it.each([
    [25,    'A'],
    [23,    'A'],   // 92%
    [22.5,  'A'],   // 90%
    [22.49, 'B'],   // 89.96% (just under 90)
    [19,    'B'],   // 76%
    [18.75, 'B'],   // 75%
    [18.74, 'C'],   // 74.96%
    [16,    'C'],   // 64%
    [15,    'C'],   // 60%
    [14.99, 'D'],   // 59.96%
    [12,    'D'],   // 48%
    [10,    'D'],   // 40%
    [9.99,  'E'],   // 39.96%
    [5,     'E'],   // 20%
    [0,     'E'],
  ])('score %p / 25 -> %p', (score, letter) => {
    expect(getBuchstabe(score, 25).letter).toBe(letter)
  })
})

describe('getBuchstabe — max 20 (Sprechen criteria, future-proofing)', () => {
  it.each([
    [20,    'A'],
    [18,    'A'],   // 90%
    [17.99, 'B'],   // 89.95%
    [15,    'B'],   // 75%
    [14.99, 'C'],   // 74.95%
    [12,    'C'],   // 60%
    [11.99, 'D'],   // 59.95%
    [8,     'D'],   // 40%
    [7.99,  'E'],   // 39.95%
    [0,     'E'],
  ])('score %p / 20 -> %p', (score, letter) => {
    expect(getBuchstabe(score, 20).letter).toBe(letter)
  })
})

describe('getBuchstabe — edge cases', () => {
  it('returns E when max is 0 (division by zero protection)', () => {
    expect(getBuchstabe(10, 0).letter).toBe('E')
  })

  it('returns E when max is negative', () => {
    expect(getBuchstabe(10, -5).letter).toBe('E')
  })

  it('clamps score above max to A', () => {
    expect(getBuchstabe(30, 25).letter).toBe('A')
  })

  it('clamps negative score to E', () => {
    expect(getBuchstabe(-5, 25).letter).toBe('E')
  })

  it('returns E for NaN/Infinity score', () => {
    expect(getBuchstabe(NaN, 25).letter).toBe('E')
    expect(getBuchstabe(Infinity, 25).letter).toBe('E')
  })

  it('exposes a CSS variable color for every letter', () => {
    for (const score of [25, 19, 16, 12, 5]) {
      const r = getBuchstabe(score, 25)
      expect(r.cssColor).toMatch(/^var\(--/)
    }
  })
})
