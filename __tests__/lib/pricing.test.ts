import { describe, it, expect } from 'vitest'
import {
  PACKAGES,
  getPackage,
  getPackagesForLocale,
  getMarketForLocale,
  minorToMajorString,
  majorStringToMinor,
  formatPrice,
} from '@/lib/pricing'

describe('lib/pricing', () => {
  describe('minorToMajorString', () => {
    it('produces a 2-decimal major string from copecks', () => {
      expect(minorToMajorString(40000)).toBe('400.00')
      expect(minorToMajorString(72000)).toBe('720.00')
      expect(minorToMajorString(136000)).toBe('1360.00')
      expect(minorToMajorString(100)).toBe('1.00')
      expect(minorToMajorString(33)).toBe('0.33')
    })
  })

  describe('majorStringToMinor', () => {
    it('parses well-formed amount strings', () => {
      expect(majorStringToMinor('400.00')).toBe(40000)
      expect(majorStringToMinor('10')).toBe(1000)
      expect(majorStringToMinor('0.33')).toBe(33)
      expect(majorStringToMinor('1360')).toBe(136000)
    })

    it('round-trips with minorToMajorString for representative amounts', () => {
      for (const minor of [40000, 72000, 136000, 100, 33, 1, 1500, 1667]) {
        expect(majorStringToMinor(minorToMajorString(minor))).toBe(minor)
      }
    })

    it('throws on garbage input', () => {
      expect(() => majorStringToMinor('abc')).toThrow()
      expect(() => majorStringToMinor('400 рублей')).toThrow()
      expect(() => majorStringToMinor('')).toThrow()
    })
  })

  describe('getPackagesForLocale / getMarketForLocale', () => {
    it('returns RU bundle for ru locale', () => {
      const pkgs = getPackagesForLocale('ru')
      expect(pkgs).toHaveLength(3)
      expect(pkgs.every((p) => p.market === 'ru')).toBe(true)
      expect(pkgs.every((p) => p.currency === 'RUB')).toBe(true)
      expect(getMarketForLocale('ru')).toBe('ru')
    })

    it('returns EU bundle for de/en/tr locales', () => {
      for (const locale of ['de', 'en', 'tr'] as const) {
        const pkgs = getPackagesForLocale(locale)
        expect(pkgs).toHaveLength(3)
        expect(pkgs.every((p) => p.market === 'eu')).toBe(true)
        expect(pkgs.every((p) => p.currency === 'EUR')).toBe(true)
        expect(getMarketForLocale(locale)).toBe('eu')
      }
    })
  })

  describe('PACKAGES shape', () => {
    it('keeps the agreed pricing matrix (29.04.2026)', () => {
      expect(PACKAGES['ru-starter'].priceMinor).toBe(40000)
      expect(PACKAGES['ru-starter'].modules).toBe(10)
      expect(PACKAGES['ru-standard'].priceMinor).toBe(72000)
      expect(PACKAGES['ru-standard'].modules).toBe(20)
      expect(PACKAGES['ru-intensive'].priceMinor).toBe(136000)
      expect(PACKAGES['ru-intensive'].modules).toBe(40)

      expect(PACKAGES['eu-starter'].priceMinor).toBe(1000)
      expect(PACKAGES['eu-standard'].priceMinor).toBe(1500)
      expect(PACKAGES['eu-intensive'].priceMinor).toBe(2000)
    })

    it('returns null for unknown package id', () => {
      expect(getPackage('unknown')).toBeNull()
      expect(getPackage('_admin-test')).toBeNull()
    })
  })

  describe('formatPrice', () => {
    it('formats RUB without decimals', () => {
      expect(formatPrice(40000, 'RUB')).toBe('400 ₽')
      expect(formatPrice(136000, 'RUB')).toBe('1 360 ₽')
    })

    it('formats EUR without decimals when integer, otherwise 2 places', () => {
      expect(formatPrice(1000, 'EUR')).toBe('€10')
      expect(formatPrice(1667, 'EUR')).toBe('€16.67')
    })
  })
})
