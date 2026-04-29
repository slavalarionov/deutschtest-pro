/**
 * Verifies an incoming Tochka `acquiringInternetPayment` webhook.
 *
 * The webhook body is a JWT (RS256) — `header.payload.signature` as raw text.
 * The public key may come from Tochka in either PEM (`-----BEGIN PUBLIC KEY-----`)
 * or JWK (`{"kty":"RSA",...}`) form; we sniff the env value and load accordingly.
 */
import { importJWK, importSPKI, jwtVerify, type CryptoKey } from 'jose'
import { getTochkaEnv } from '@/lib/env'
import { WebhookPayloadSchema, type WebhookPayload } from './types'

type VerifyKey = CryptoKey | Uint8Array

let cachedKey: VerifyKey | null = null

async function loadPublicKey(): Promise<VerifyKey> {
  if (cachedKey) return cachedKey
  const raw = getTochkaEnv().TOCHKA_WEBHOOK_PUBLIC_KEY.trim()

  if (!raw) {
    throw new Error(
      'TOCHKA_WEBHOOK_PUBLIC_KEY is not set — webhook channel inactive. ' +
        'Configure it in env after enabling webhooks in the Tochka dashboard.',
    )
  }

  if (raw.startsWith('-----BEGIN')) {
    cachedKey = (await importSPKI(raw, 'RS256')) as VerifyKey
    return cachedKey
  }

  try {
    const jwk = JSON.parse(raw) as Record<string, unknown>
    cachedKey = (await importJWK(jwk, 'RS256')) as VerifyKey
    return cachedKey
  } catch (err) {
    throw new Error(
      'TOCHKA_WEBHOOK_PUBLIC_KEY is neither PEM nor valid JWK JSON. ' +
        'Expected formats:\n' +
        '  PEM:  "-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"\n' +
        '  JWK:  \'{"kty":"RSA","n":"...","e":"AQAB"}\'\n' +
        `Original error: ${(err as Error).message}`,
    )
  }
}

/** Test-only helper: reset the cached key so unit tests can swap env values. */
export function _resetTochkaWebhookKeyCache(): void {
  cachedKey = null
}

export async function verifyTochkaWebhook(jwtString: string): Promise<WebhookPayload> {
  const key = await loadPublicKey()
  const { payload } = await jwtVerify(jwtString, key, {
    algorithms: ['RS256'],
  })
  return WebhookPayloadSchema.parse(payload)
}
