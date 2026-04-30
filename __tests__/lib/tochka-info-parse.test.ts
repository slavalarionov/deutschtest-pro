/**
 * Defensive-parse tests for `GET /acquiring/v1.0/payments/{id}`.
 *
 * Tochka has shipped this endpoint with two response shapes (flat `Data`
 * and `Data.Operation[]`). The schema must accept both, and `getPaymentInfo`
 * must hand callers a flat `PaymentOperationInfo` — anything else makes
 * the polling fallback in /api/payments/[orderId]/status fragile against
 * a future bank-side shape change.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PaymentInfoResponseSchema } from '@/lib/tochka/types'
import { getPaymentInfo } from '@/lib/tochka/client'

describe('PaymentInfoResponseSchema', () => {
  it('accepts the flat-Data shape', () => {
    const parsed = PaymentInfoResponseSchema.parse({
      Data: {
        operationId: 'op-1',
        status: 'APPROVED',
        amount: '400.00',
        paymentType: 'card',
      },
    })
    expect('operationId' in parsed.Data && parsed.Data.operationId).toBe('op-1')
  })

  it('accepts the Data.Operation[] wrapped shape', () => {
    const parsed = PaymentInfoResponseSchema.parse({
      Data: {
        Operation: [
          {
            operationId: 'op-2',
            status: 'APPROVED',
            paymentType: 'sbp',
          },
        ],
      },
    })
    const data = parsed.Data as { Operation?: Array<{ operationId: string }> }
    expect(data.Operation?.[0].operationId).toBe('op-2')
  })

  it('accepts amount as a number inside Operation[] (real prod payload)', () => {
    const parsed = PaymentInfoResponseSchema.parse({
      Data: {
        Operation: [
          {
            operationId: 'op-3',
            status: 'APPROVED',
            amount: 400,
            paymentType: 'card',
          },
        ],
      },
    })
    const data = parsed.Data as { Operation?: Array<{ amount?: unknown }> }
    expect(data.Operation?.[0].amount).toBe(400)
  })

  it('rejects a payload missing both forms (sanity)', () => {
    expect(() =>
      PaymentInfoResponseSchema.parse({ Data: { foo: 'bar' } }),
    ).toThrow()
  })
})

describe('getPaymentInfo (integration with stubbed fetch)', () => {
  let captured: { url: string } | null = null

  beforeEach(() => {
    captured = null
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(body: unknown) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        captured = { url }
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )
  }

  it('flattens the Operation[] response into a plain info object', async () => {
    stubFetch({
      Data: {
        Operation: [
          {
            operationId: 'op-flat-1',
            status: 'APPROVED',
            amount: 400,
            paymentType: 'card',
          },
        ],
      },
    })
    const info = await getPaymentInfo('op-flat-1')
    expect(info.operationId).toBe('op-flat-1')
    expect(info.status).toBe('APPROVED')
    expect(info.paymentType).toBe('card')
    expect(captured?.url).toContain('acquiring/v1.0/payments/op-flat-1')
  })

  it('passes the flat-Data response through as-is', async () => {
    stubFetch({
      Data: {
        operationId: 'op-flat-2',
        status: 'CREATED',
        amount: '400.00',
      },
    })
    const info = await getPaymentInfo('op-flat-2')
    expect(info.operationId).toBe('op-flat-2')
    expect(info.status).toBe('CREATED')
  })

  it('surfaces the raw response in logs when parsing fails', async () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {})
    stubFetch({ Data: { weird: 'shape' } })
    await expect(getPaymentInfo('op-bad')).rejects.toThrow()
    const messages = consoleErr.mock.calls.map((c) => String(c[0]))
    expect(
      messages.some((m) => m.includes('failed to parse response')),
    ).toBe(true)
    expect(messages.some((m) => m.includes('raw response'))).toBe(true)
    consoleErr.mockRestore()
  })
})
