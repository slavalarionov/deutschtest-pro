/**
 * Tests for `maskSensitive`. The helper is the only thing standing between
 * us and customerCode / email / JWT leaks in stdout, so:
 *   - it must NEVER mutate its input,
 *   - it must produce a deep copy (so nested mutation downstream can't bleed
 *     into the original either),
 *   - it must catch sensitive keys at any depth, regardless of letter case.
 */
import { describe, it, expect } from 'vitest'
import { maskSensitive } from '@/lib/tochka/client'

describe('maskSensitive', () => {
  it('returns primitives unchanged', () => {
    expect(maskSensitive('hello')).toBe('hello')
    expect(maskSensitive(42)).toBe(42)
    expect(maskSensitive(true)).toBe(true)
    expect(maskSensitive(null)).toBeNull()
    expect(maskSensitive(undefined)).toBeUndefined()
  })

  it('does not mutate the input object', () => {
    const input = {
      Data: {
        customerCode: '300000000',
        Operation: [{ Client: { email: 'user@example.com' }, amount: '400.00' }],
      },
    }
    const before = JSON.stringify(input)
    maskSensitive(input)
    expect(JSON.stringify(input)).toBe(before)
  })

  it('returns a deeply-cloned structure', () => {
    const input = {
      Data: { customerCode: '300', nested: { x: 1 } },
      arr: [{ a: 1 }],
    }
    const out = maskSensitive(input) as typeof input
    expect(out).not.toBe(input)
    expect(out.Data).not.toBe(input.Data)
    expect(out.Data.nested).not.toBe(input.Data.nested)
    expect(out.arr).not.toBe(input.arr)
    expect(out.arr[0]).not.toBe(input.arr[0])
  })

  it('masks customerCode at any depth', () => {
    const input = {
      Data: {
        customerCode: '300000000',
        merchantId: '123456789012345',
        Operation: [
          { customerCode: 'leaked', amount: '400.00' },
        ],
      },
    }
    const out = maskSensitive(input) as {
      Data: {
        customerCode: string
        merchantId: string
        Operation: Array<{ customerCode: string; amount: string }>
      }
    }
    expect(out.Data.customerCode).toBe('***masked***')
    expect(out.Data.merchantId).toBe('123456789012345')
    expect(out.Data.Operation[0].customerCode).toBe('***masked***')
    expect(out.Data.Operation[0].amount).toBe('400.00')
  })

  it('masks Client.email inside Operation[]', () => {
    const input = {
      Data: {
        Operation: [{ Client: { email: 'user@example.com' } }],
      },
    }
    const out = maskSensitive(input) as {
      Data: { Operation: Array<{ Client: { email: string } }> }
    }
    expect(out.Data.Operation[0].Client.email).toBe('***masked***')
  })

  it('masks Authorization and JWT keys regardless of letter case', () => {
    const input = {
      headers: { Authorization: 'Bearer secret', AUTHORIZATION: 'x' },
      jwt: 'token',
      JWT: 'token2',
    }
    const out = maskSensitive(input) as {
      headers: { Authorization: string; AUTHORIZATION: string }
      jwt: string
      JWT: string
    }
    expect(out.headers.Authorization).toBe('***masked***')
    expect(out.headers.AUTHORIZATION).toBe('***masked***')
    expect(out.jwt).toBe('***masked***')
    expect(out.JWT).toBe('***masked***')
  })

  it('leaves non-sensitive sibling fields untouched', () => {
    const input = {
      Data: {
        customerCode: '300',
        merchantId: '123456789012345',
        Operation: [
          {
            amount: '400.00',
            purpose: 'Пакет Starter — 10 модулей',
            paymentMode: ['card', 'sbp'],
            Items: [
              {
                vatType: 'none',
                name: 'Пакет Starter — 10 модулей',
                amount: '400.00',
                quantity: 1,
              },
            ],
          },
        ],
      },
    }
    const out = maskSensitive(input) as typeof input
    expect(out.Data.merchantId).toBe('123456789012345')
    expect(out.Data.Operation[0].amount).toBe('400.00')
    expect(out.Data.Operation[0].paymentMode).toEqual(['card', 'sbp'])
    expect(out.Data.Operation[0].Items[0].name).toBe(
      'Пакет Starter — 10 модулей',
    )
    expect(out.Data.Operation[0].Items[0].vatType).toBe('none')
  })

  it('handles arrays and nested arrays', () => {
    const input = [
      { customerCode: 'a' },
      [{ customerCode: 'b' }, { customerCode: 'c' }],
    ]
    const out = maskSensitive(input) as Array<unknown>
    expect((out[0] as { customerCode: string }).customerCode).toBe('***masked***')
    const nested = out[1] as Array<{ customerCode: string }>
    expect(nested[0].customerCode).toBe('***masked***')
    expect(nested[1].customerCode).toBe('***masked***')
  })
})
