/**
 * Route-handler tests for /api/webhooks/tochka.
 *
 * Mocks the verification helper and the Supabase admin client. We assert:
 *   - invalid signature → 401, RPC never called
 *   - non-APPROVED status → 200 OK, RPC never called
 *   - APPROVED status → RPC called with the right args, 200 OK
 *   - idempotent re-delivery (was_already_approved) → 200, email not sent
 *   - missing payment row → 200 (no infinite retry)
 *   - generic DB error → 500 (so Tochka retries upstream)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  rpcMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  selectMock: vi.fn(),
  sendEmailMock: vi.fn(),
}))

vi.mock('@/lib/tochka/webhook', () => ({
  verifyTochkaWebhook: (...args: unknown[]) => mocks.verifyMock(...args),
}))

vi.mock('@/lib/email/payment-success', () => ({
  sendPaymentSuccessEmail: (...args: unknown[]) =>
    mocks.sendEmailMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: (...args: unknown[]) => mocks.rpcMock(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(mocks.selectMock()),
        }),
      }),
      insert: (row: unknown) => Promise.resolve(mocks.insertMock(row)),
      update: (row: unknown) => ({
        eq: () => Promise.resolve(mocks.updateMock(row)),
      }),
    }),
  }),
}))

beforeEach(() => {
  mocks.verifyMock.mockReset()
  mocks.rpcMock.mockReset()
  mocks.insertMock.mockReset().mockReturnValue({ error: null })
  mocks.updateMock.mockReset().mockReturnValue({ error: null })
  mocks.selectMock
    .mockReset()
    .mockReturnValue({ data: { current_redemptions: 0 }, error: null })
  mocks.sendEmailMock.mockReset().mockResolvedValue(undefined)
})

async function callPost(body: string) {
  const { POST } = await import('@/app/api/webhooks/tochka/route')
  const req = new Request('https://example.com/api/webhooks/tochka', {
    method: 'POST',
    body,
  })
  return POST(req as unknown as Parameters<typeof POST>[0])
}

describe('POST /api/webhooks/tochka', () => {
  it('returns 401 when verification fails', async () => {
    mocks.verifyMock.mockRejectedValue(new Error('bad signature'))
    const res = await callPost('garbage')
    expect(res.status).toBe(401)
    expect(mocks.rpcMock).not.toHaveBeenCalled()
  })

  it('returns 200 and ignores non-APPROVED webhook events', async () => {
    mocks.verifyMock.mockResolvedValue({
      operationId: 'op-1',
      status: 'AUTHORIZED',
      paymentType: 'card',
    })
    const res = await callPost('jwt-stub')
    expect(res.status).toBe(200)
    expect(mocks.rpcMock).not.toHaveBeenCalled()
  })

  it('credits modules via RPC on APPROVED', async () => {
    mocks.verifyMock.mockResolvedValue({
      operationId: 'op-2',
      status: 'APPROVED',
      paymentType: 'card',
    })
    mocks.rpcMock.mockResolvedValue({
      data: [
        {
          payment_id: 'p-2',
          user_id: 'u-2',
          modules_credited: 10,
          promo_code_id: null,
          was_already_approved: false,
        },
      ],
      error: null,
    })

    const res = await callPost('jwt-stub')
    expect(res.status).toBe(200)
    expect(mocks.rpcMock).toHaveBeenCalledWith('approve_payment_atomic', {
      p_provider_operation_id: 'op-2',
      p_payment_method: 'card',
    })
  })

  it('returns 200 idempotently when the payment was already approved', async () => {
    mocks.verifyMock.mockResolvedValue({
      operationId: 'op-3',
      status: 'APPROVED',
      paymentType: 'sbp',
    })
    mocks.rpcMock.mockResolvedValue({
      data: [
        {
          payment_id: 'p-3',
          user_id: 'u-3',
          modules_credited: 0,
          promo_code_id: null,
          was_already_approved: true,
        },
      ],
      error: null,
    })

    const res = await callPost('jwt-stub')
    expect(res.status).toBe(200)
    expect(mocks.rpcMock).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmailMock).not.toHaveBeenCalled()
  })

  it('returns 200 (no infinite retry) when payment row is missing', async () => {
    mocks.verifyMock.mockResolvedValue({
      operationId: 'op-missing',
      status: 'APPROVED',
      paymentType: 'card',
    })
    mocks.rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'payment_not_found' },
    })

    const res = await callPost('jwt-stub')
    expect(res.status).toBe(200)
  })

  it('returns 500 (so Tochka retries) on a generic DB error', async () => {
    mocks.verifyMock.mockResolvedValue({
      operationId: 'op-err',
      status: 'APPROVED',
      paymentType: 'card',
    })
    mocks.rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'connection refused' },
    })

    const res = await callPost('jwt-stub')
    expect(res.status).toBe(500)
  })
})
