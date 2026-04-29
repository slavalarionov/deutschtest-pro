/**
 * Verifies the RS256 verification path. We generate an RSA pair at runtime,
 * publish the public key into TOCHKA_WEBHOOK_PUBLIC_KEY (PEM and JWK variants
 * exercise both branches), and check that:
 *   - a JWT signed with the matching private key parses cleanly,
 *   - a JWT signed with a *different* private key is rejected,
 *   - garbage input is rejected,
 *   - a payload missing required fields fails Zod.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { exportJWK, exportSPKI, generateKeyPair, SignJWT } from 'jose'
import {
  verifyTochkaWebhook,
  _resetTochkaWebhookKeyCache,
} from '@/lib/tochka/webhook'

let goodPriv: CryptoKey
let goodPub: CryptoKey
let goodPubPEM: string
let goodPubJWK: string
let badPriv: CryptoKey

beforeAll(async () => {
  const a = await generateKeyPair('RS256', { modulusLength: 2048 })
  goodPriv = a.privateKey
  goodPub = a.publicKey
  goodPubPEM = await exportSPKI(goodPub)
  goodPubJWK = JSON.stringify({ ...(await exportJWK(goodPub)), alg: 'RS256' })
  const b = await generateKeyPair('RS256', { modulusLength: 2048 })
  badPriv = b.privateKey
})

async function sign(
  privateKey: CryptoKey,
  payload: Record<string, unknown>,
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .sign(privateKey)
}

describe('verifyTochkaWebhook (PEM)', () => {
  beforeAll(() => {
    process.env.TOCHKA_WEBHOOK_PUBLIC_KEY = goodPubPEM
    _resetTochkaWebhookKeyCache()
  })

  it('accepts a valid signature and returns the parsed payload', async () => {
    const jwt = await sign(goodPriv, {
      webhookType: 'acquiringInternetPayment',
      operationId: 'op-1',
      status: 'APPROVED',
      paymentLinkId: 'order-1',
      paymentType: 'card',
      amount: '400.00',
    })
    const payload = await verifyTochkaWebhook(jwt)
    expect(payload.operationId).toBe('op-1')
    expect(payload.status).toBe('APPROVED')
    expect(payload.paymentType).toBe('card')
  })

  it('rejects a JWT signed with a different key', async () => {
    const jwt = await sign(badPriv, {
      operationId: 'op-2',
      status: 'APPROVED',
    })
    await expect(verifyTochkaWebhook(jwt)).rejects.toThrow()
  })

  it('rejects a malformed JWT', async () => {
    await expect(verifyTochkaWebhook('not-a-jwt')).rejects.toThrow()
  })

  it('rejects a payload missing required fields', async () => {
    const jwt = await sign(goodPriv, { foo: 'bar' })
    await expect(verifyTochkaWebhook(jwt)).rejects.toThrow()
  })
})

describe('verifyTochkaWebhook (JWK)', () => {
  beforeAll(() => {
    process.env.TOCHKA_WEBHOOK_PUBLIC_KEY = goodPubJWK
    _resetTochkaWebhookKeyCache()
  })

  it('also accepts a JWK-formatted public key', async () => {
    const jwt = await sign(goodPriv, {
      operationId: 'op-3',
      status: 'APPROVED',
      paymentType: 'sbp',
    })
    const payload = await verifyTochkaWebhook(jwt)
    expect(payload.operationId).toBe('op-3')
    expect(payload.paymentType).toBe('sbp')
  })
})

// "no key configured" path is exercised at runtime by the route handler
// returning 401 when the loader throws — verified via the API tests in
// __tests__/api/webhooks-tochka.test.ts.
