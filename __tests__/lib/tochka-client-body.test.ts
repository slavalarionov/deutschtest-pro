/**
 * Regression test for the Tochka `payments_with_receipt` wire body shape.
 *
 * Hotfix-3 wrapped the body in `Operation[]` based on the API changelog;
 * Tochka rejected it with 400 "Field amount/purpose/paymentMode/Client/
 * Items required". The diagnostic capture in commit cdadc31 proved the
 * endpoint expects a flat `Data` shape. This test pins that down so the
 * `Operation[]` mistake cannot quietly come back.
 *
 * It stubs the global `fetch`, calls the real `createPayment` once, and
 * asserts the captured body is exactly `{ Data: { ... flat ... } }` —
 * including the fiscal `Items[0]` line and the buyer's `Client.email`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPayment } from '@/lib/tochka/client'

interface CapturedRequest {
  url: string
  method: string
  body: unknown
}

let captured: CapturedRequest | null = null

beforeEach(() => {
  captured = null
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    captured = {
      url,
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : null,
    }
    // Mirrors a real Tochka response: `amount` is a *number* (400), not a
    // string ("400.00"). We don't consume it, but the Zod schema must not
    // choke on the type difference — see hotfix-3.3.
    const response = JSON.stringify({
      Data: {
        operationId: 'op-stub-1',
        paymentLink: 'https://enter.tochka.com/payment/op-stub-1',
        amount: 400,
        status: 'CREATED',
      },
    })
    return new Response(response, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }) as Response
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createPayment wire body', () => {
  it('hits payments_with_receipt with a flat Data envelope (no Operation[])', async () => {
    await createPayment({
      packageId: 'ru-starter',
      amountMinor: 40000,
      redirectUrl: 'https://deutschtest.pro/ru/payment/success?orderId=abc',
      failRedirectUrl: 'https://deutschtest.pro/ru/payment/cancel?orderId=abc',
      clientEmail: 'buyer@example.com',
    })

    expect(captured).not.toBeNull()
    expect(captured!.method).toBe('POST')
    expect(captured!.url).toContain('acquiring/v1.0/payments_with_receipt')

    const body = captured!.body as {
      Data?: {
        customerCode?: string
        merchantId?: string
        amount?: string
        purpose?: string
        paymentMode?: string[]
        redirectUrl?: string
        failRedirectUrl?: string
        Operation?: unknown
        Items?: Array<Record<string, unknown>>
        Client?: { email?: string }
      }
    }

    // The whole point: required fields live on Data, not on Operation[0].
    expect(body.Data).toBeTruthy()
    expect(body.Data!.Operation).toBeUndefined()
    expect(typeof body.Data!.customerCode).toBe('string')
    expect(typeof body.Data!.merchantId).toBe('string')
    expect(body.Data!.amount).toBe('400.00')
    expect(body.Data!.paymentMode).toEqual(['card', 'sbp'])
    expect(body.Data!.redirectUrl).toContain('/ru/payment/success')
    expect(body.Data!.failRedirectUrl).toContain('/ru/payment/cancel')
    expect(body.Data!.purpose).toMatch(/^Пакет Starter — 10 модулей/)
  })

  it('attaches a single Items[] line with УСН-friendly fiscal fields', async () => {
    await createPayment({
      packageId: 'ru-standard',
      amountMinor: 72000,
      redirectUrl: 'https://deutschtest.pro/ru/payment/success?orderId=abc',
      clientEmail: 'buyer@example.com',
    })

    const body = captured!.body as {
      Data: {
        Items: Array<{
          vatType: string
          name: string
          amount: string
          quantity: number
          paymentMethod: string
          paymentObject: string
        }>
      }
    }
    expect(body.Data.Items).toHaveLength(1)
    const item = body.Data.Items[0]
    expect(item.vatType).toBe('none')
    expect(item.amount).toBe('720.00')
    expect(item.quantity).toBe(1)
    expect(item.paymentMethod).toBe('full_payment')
    expect(item.paymentObject).toBe('service')
    expect(item.name).toBe('Пакет Standard — 20 модулей AI-экзамена немецкого')
  })

  it('forwards the cardholder email under Client.email', async () => {
    await createPayment({
      packageId: 'ru-intensive',
      amountMinor: 136000,
      redirectUrl: 'https://deutschtest.pro/ru/payment/success?orderId=abc',
      clientEmail: 'buyer@example.com',
    })

    const body = captured!.body as { Data: { Client: { email: string } } }
    expect(body.Data.Client.email).toBe('buyer@example.com')
  })

  it('refuses to use the RU client for an EU package', async () => {
    await expect(
      createPayment({
        packageId: 'eu-starter',
        amountMinor: 1000,
        redirectUrl: 'https://deutschtest.pro/de/payment/success?orderId=abc',
        clientEmail: 'buyer@example.com',
      }),
    ).rejects.toThrow(/non-RU package/)
  })

  it('parses a response cleanly when Tochka returns amount as a number', async () => {
    // The default fetchMock above already returns `amount: 400` (number).
    // If the Zod schema regresses and re-requires `amount: string`, this
    // call will throw a ZodError instead of returning the operationId.
    const result = await createPayment({
      packageId: 'ru-starter',
      amountMinor: 40000,
      redirectUrl: 'https://deutschtest.pro/ru/payment/success?orderId=abc',
      clientEmail: 'buyer@example.com',
    })
    expect(result.operationId).toBe('op-stub-1')
    expect(result.paymentLink).toBe(
      'https://enter.tochka.com/payment/op-stub-1',
    )
  })
})
