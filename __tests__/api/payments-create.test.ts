/**
 * Route-handler tests for /api/payments/create.
 *
 * Mocks: supabase server-client, supabase admin-client, lib/tochka/client,
 * rate-limit (always allow), and validateFlowAPromo (we don't exercise the
 * promo path here — covered separately).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  insertSelectMock: vi.fn(),
  updateMock: vi.fn(),
  createPaymentMock: vi.fn(),
  validatePromoMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUserMock() },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve(mocks.insertSelectMock()),
        }),
      }),
      update: (row: unknown) => ({
        eq: () => Promise.resolve(mocks.updateMock(row)),
      }),
    }),
  }),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({
    allowed: true,
    remaining: 9,
    resetAt: Date.now() + 60_000,
  }),
}))

vi.mock('@/lib/get-client-ip', () => ({
  getClientIp: () => '127.0.0.1',
}))

vi.mock('@/lib/env', () => ({
  getAppUrl: () => 'https://deutschtest.pro',
  getTochkaEnv: () => ({
    TOCHKA_JWT_TOKEN: 't',
    TOCHKA_CUSTOMER_CODE: '300000000',
    TOCHKA_MERCHANT_ID: '123456789012345',
    TOCHKA_API_BASE_URL: 'https://enter.tochka.com/uapi/',
    TOCHKA_WEBHOOK_PUBLIC_KEY: '',
  }),
}))

vi.mock('@/lib/tochka/client', () => ({
  createPayment: (...args: unknown[]) => mocks.createPaymentMock(...args),
}))

vi.mock('@/lib/promo/validate-flow-a', () => ({
  validateFlowAPromo: (...args: unknown[]) => mocks.validatePromoMock(...args),
}))

beforeEach(() => {
  mocks.getUserMock.mockReset()
  mocks.insertSelectMock
    .mockReset()
    .mockReturnValue({ data: { id: 'pay-1' }, error: null })
  mocks.updateMock.mockReset().mockReturnValue({ error: null })
  mocks.createPaymentMock.mockReset().mockResolvedValue({
    operationId: 'op-stub',
    paymentLink: 'https://enter.tochka.com/payment/op-stub',
  })
  mocks.validatePromoMock.mockReset()
})

async function callPost(body: unknown) {
  const { POST } = await import('@/app/api/payments/create/route')
  const req = new Request('https://example.com/api/payments/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  })
  return POST(req as unknown as Parameters<typeof POST>[0])
}

describe('POST /api/payments/create', () => {
  it('returns 401 when the user is not signed in', async () => {
    mocks.getUserMock.mockResolvedValue({ data: { user: null } })
    const res = await callPost({ packageId: 'ru-starter', locale: 'ru' })
    expect(res.status).toBe(401)
  })

  it('rejects an unknown packageId with 400', async () => {
    mocks.getUserMock.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.c' } },
    })
    const res = await callPost({ packageId: 'pluto-mega', locale: 'ru' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('invalid_package')
  })

  it('rejects locale↔market mismatch with 400', async () => {
    mocks.getUserMock.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.c' } },
    })
    const res = await callPost({ packageId: 'eu-starter', locale: 'ru' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('package_market_mismatch')
  })

  it('rejects EU purchases until Prodamus is wired', async () => {
    mocks.getUserMock.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.c' } },
    })
    const res = await callPost({ packageId: 'eu-starter', locale: 'de' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('international_payments_not_yet_available')
  })

  it('rejects with 400 email_required_for_receipt when the auth user has no email', async () => {
    mocks.getUserMock.mockResolvedValue({
      data: { user: { id: 'u-1', email: null } },
    })
    const res = await callPost({ packageId: 'ru-starter', locale: 'ru' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('email_required_for_receipt')
    expect(mocks.createPaymentMock).not.toHaveBeenCalled()
  })

  it('happy path: returns paymentUrl from Tochka on /ru', async () => {
    mocks.getUserMock.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.c' } },
    })
    const res = await callPost({ packageId: 'ru-starter', locale: 'ru' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.paymentUrl).toBe('https://enter.tochka.com/payment/op-stub')
    expect(body.orderId).toMatch(/^[a-z0-9_-]{12}$/)

    expect(mocks.createPaymentMock).toHaveBeenCalledTimes(1)
    const call = mocks.createPaymentMock.mock.calls[0][0] as {
      packageId: string
      amountMinor: number
      redirectUrl: string
      failRedirectUrl: string
      clientEmail: string
    }
    expect(call.packageId).toBe('ru-starter')
    expect(call.amountMinor).toBe(40000)
    expect(call.redirectUrl).toMatch(/\/ru\/payment\/success/)
    expect(call.failRedirectUrl).toMatch(/\/ru\/payment\/cancel/)
    expect(call.clientEmail).toBe('a@b.c')
  })
})
