/**
 * Tochka acquiring API client.
 *
 * Server-only. Wraps `POST /acquiring/v1.0/payments`,
 * `GET /acquiring/v1.0/payments/{id}` and `POST .../{id}/refund` per the
 * flat-Data structure documented in the Tochka acquiring PDF: the body is
 * `{ Data: { customerCode, amount, purpose, paymentMode, redirectUrl, ... } }`,
 * NOT wrapped in an `Operation[]` array, and `merchantId` / `paymentLinkId`
 * are not part of the request.
 *
 * Amounts are passed in minor units (`amountMinor`) at the function
 * boundary and converted to a major-unit decimal string at the wire — we
 * never accept floats from callers to avoid silent FP drift.
 *
 * Errors fork into TochkaApiError (4xx — caller's fault, surface to user)
 * and TochkaServerError (5xx — provider issue, retryable upstream).
 */
import { getTochkaEnv } from '@/lib/env'
import { minorToMajorString } from '@/lib/pricing'
import {
  CreatePaymentResponseSchema,
  PaymentInfoResponseSchema,
  TochkaApiError,
  TochkaServerError,
  type CreatePaymentRequest,
  type CreatePaymentResponse,
  type PaymentInfoResponse,
} from './types'

function buildUrl(path: string): string {
  const env = getTochkaEnv()
  const base = env.TOCHKA_API_BASE_URL.endsWith('/')
    ? env.TOCHKA_API_BASE_URL
    : `${env.TOCHKA_API_BASE_URL}/`
  const trimmed = path.startsWith('/') ? path.slice(1) : path
  return `${base}${trimmed}`
}

async function request<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<T> {
  const env = getTochkaEnv()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.TOCHKA_JWT_TOKEN}`,
    Accept: 'application/json',
  }
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(buildUrl(path), {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  const text = await res.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }

  if (res.status >= 500) {
    throw new TochkaServerError(res.status, parsed)
  }
  if (!res.ok) {
    const message =
      (parsed as { Errors?: Array<{ message?: string }> })?.Errors?.[0]
        ?.message ?? `Tochka API ${res.status}`
    throw new TochkaApiError(res.status, message, parsed)
  }

  return parsed as T
}

export async function createPayment(
  params: CreatePaymentRequest,
): Promise<{ operationId: string; paymentLink: string }> {
  const env = getTochkaEnv()

  if (!Number.isInteger(params.amountMinor) || params.amountMinor <= 0) {
    throw new Error(`Invalid amountMinor: ${params.amountMinor}`)
  }

  const body = {
    Data: {
      customerCode: env.TOCHKA_CUSTOMER_CODE,
      merchantId: env.TOCHKA_MERCHANT_ID,
      amount: minorToMajorString(params.amountMinor),
      purpose: params.purpose.slice(0, 140),
      paymentMode: params.paymentMode,
      redirectUrl: params.redirectUrl,
      ...(params.failRedirectUrl
        ? { failRedirectUrl: params.failRedirectUrl }
        : {}),
      ...(params.clientEmail
        ? { Client: { email: params.clientEmail } }
        : {}),
    },
  }

  const raw = await request<unknown>('acquiring/v1.0/payments', {
    method: 'POST',
    body,
  })

  const parsed: CreatePaymentResponse = CreatePaymentResponseSchema.parse(raw)
  return {
    operationId: parsed.Data.operationId,
    paymentLink: parsed.Data.paymentLink,
  }
}

export async function getPaymentInfo(
  operationId: string,
): Promise<PaymentInfoResponse> {
  const raw = await request<unknown>(
    `acquiring/v1.0/payments/${encodeURIComponent(operationId)}`,
    { method: 'GET' },
  )
  return PaymentInfoResponseSchema.parse(raw)
}

export async function refundPayment(
  operationId: string,
  amountMinor: number,
): Promise<void> {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error(`Invalid amountMinor: ${amountMinor}`)
  }
  await request(
    `acquiring/v1.0/payments/${encodeURIComponent(operationId)}/refund`,
    {
      method: 'POST',
      body: {
        Data: { amount: minorToMajorString(amountMinor) },
      },
    },
  )
}
