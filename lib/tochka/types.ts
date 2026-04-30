import { z } from 'zod'
import type { PackageId } from '@/lib/pricing'

/* -------------------------------------------------------------------------- */
/*  Create Payment with Receipt — flat Operation[] wrapper                     */
/* -------------------------------------------------------------------------- */

export const TochkaPaymentModeSchema = z.enum(['card', 'sbp', 'dolyame', 'tinkoff'])
export type TochkaPaymentMode = z.infer<typeof TochkaPaymentModeSchema>

/**
 * Receipt item for 54-FZ fiscal data forwarded to the merchant's online
 * cash register (Бизнес.Ру in our case) → ОФД → ФНС. We always send a
 * single line item per payment because we sell whole packages.
 */
export const ReceiptItemSchema = z.object({
  vatType: z.enum(['none', 'vat0', 'vat10', 'vat20', 'vat110', 'vat120']),
  name: z.string().min(1).max(128),
  amount: z.string(),
  quantity: z.number().positive(),
  paymentMethod: z.enum([
    'full_prepayment',
    'partial_prepayment',
    'advance',
    'full_payment',
    'partial_payment',
    'credit',
    'credit_payment',
  ]),
  paymentObject: z.enum([
    'commodity',
    'excise',
    'job',
    'service',
    'gambling_bet',
    'gambling_prize',
    'lottery',
    'lottery_prize',
    'intellectual_activity',
    'payment',
    'agent_commission',
    'composite',
    'another',
  ]),
  measurementUnit: z.string().optional(),
})
export type ReceiptItem = z.infer<typeof ReceiptItemSchema>

/**
 * Caller-side params for `createPayment`. The wire-body is assembled inside
 * the client itself — including the receipt line item — from the package
 * metadata; the route only supplies what it owns (final amount after promo
 * discount, redirect URLs, the cardholder's email).
 */
export interface CreatePaymentRequest {
  packageId: PackageId
  amountMinor: number
  redirectUrl: string
  failRedirectUrl?: string
  clientEmail: string
}

/**
 * Wire body for `POST /acquiring/v1.0/payments_with_receipt`.
 *
 * The acquiring `payments_with_receipt` endpoint takes a flat `Data` shape —
 * NOT the `Operation[]` envelope our hotfix-3 first guessed at. The 400
 * "Field amount/purpose/paymentMode/Client/Items required" reproduction
 * confirmed Tochka inspects these fields directly on `Data`. The schema
 * exists primarily to anchor the contract for tests and documentation; the
 * wire body is built (and stringified) inside `lib/tochka/client.ts`.
 */
export const CreatePaymentRequestSchema = z.object({
  Data: z.object({
    customerCode: z.string(),
    merchantId: z.string(),
    amount: z.string(),
    purpose: z.string().min(1).max(140),
    paymentMode: z.array(TochkaPaymentModeSchema).min(1),
    redirectUrl: z.string().url(),
    failRedirectUrl: z.string().url().optional(),
    Items: z.array(ReceiptItemSchema).min(1),
    Client: z.object({ email: z.string().email() }),
  }),
})
export type CreatePaymentRequestBody = z.infer<typeof CreatePaymentRequestSchema>

/**
 * Response for both `payments` and `payments_with_receipt` — flat `Data`
 * with `operationId` and `paymentLink`.
 *
 * Tochka returns `Data.amount` as a *number* in this endpoint (e.g. `400`
 * — not `"400.00"`), even though the request takes a string. We don't read
 * the value back here (the canonical amount is already in our DB), so the
 * schema only nails down `operationId` and `paymentLink`. `.passthrough()`
 * keeps any extra fields available for diagnostic logging without
 * triggering type validation against them.
 */
export const CreatePaymentResponseSchema = z.object({
  Data: z
    .object({
      operationId: z.string().min(1),
      paymentLink: z.string().url(),
    })
    .passthrough(),
  Links: z.object({ self: z.string().url() }).optional(),
})
export type CreatePaymentResponse = z.infer<typeof CreatePaymentResponseSchema>

/* -------------------------------------------------------------------------- */
/*  Get Payment Info — flat Data, unchanged                                    */
/* -------------------------------------------------------------------------- */

export const TochkaPaymentStatusSchema = z.enum([
  'CREATED',
  'AUTHORIZED',
  'APPROVED',
  'EXPIRED',
  'CANCELED',
])
export type TochkaPaymentStatus = z.infer<typeof TochkaPaymentStatusSchema>

/**
 * Per-operation info that lives either directly on `Data` or inside
 * `Data.Operation[]`, depending on the endpoint version. Same fields in
 * both shapes — only the wrapping changes.
 */
export const PaymentOperationInfoSchema = z
  .object({
    operationId: z.string(),
    status: TochkaPaymentStatusSchema,
    // Tochka can ship `amount` as either string ("400.00") or number
    // (400) depending on the endpoint version — accept both, optional
    // because nothing downstream relies on it (status drives the polling
    // fallback in /api/payments/[orderId]/status).
    amount: z.union([z.string(), z.number()]).optional(),
    purpose: z.string().optional(),
    paymentMode: z.array(z.string()).optional(),
    paymentType: z.string().optional(),
    paymentLink: z.string().url().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough()
export type PaymentOperationInfo = z.infer<typeof PaymentOperationInfoSchema>

/**
 * `GET /acquiring/v1.0/payments/{operationId}` is observed in production
 * to wrap the per-operation fields inside `Data.Operation[0]`, NOT to
 * expose them flat on `Data` as the older docs suggest. Older sandboxes
 * have been seen returning the flat form. The schema accepts both via a
 * union so the polling fallback in /api/payments/[orderId]/status keeps
 * working across whatever shape the bank serves up. The client extracts
 * the inner record and returns it as a plain object — callers don't have
 * to discriminate.
 */
export const PaymentInfoResponseSchema = z
  .object({
    Data: z.union([
      PaymentOperationInfoSchema,
      z
        .object({
          Operation: z.array(PaymentOperationInfoSchema).min(1),
        })
        .passthrough(),
    ]),
  })
  .passthrough()
export type PaymentInfoResponse = z.infer<typeof PaymentInfoResponseSchema>

/* -------------------------------------------------------------------------- */
/*  Webhook payload — unchanged (same shape for both endpoints)                */
/* -------------------------------------------------------------------------- */

export const WebhookPayloadSchema = z
  .object({
    webhookType: z.string().optional(),
    customerCode: z.string().optional(),
    operationId: z.string().min(1),
    // Same string-or-number reality as in PaymentInfoResponseSchema.
    amount: z.union([z.string(), z.number()]).optional(),
    status: z.string().min(1),
    paymentLinkId: z.string().optional(),
    paymentType: z.string().optional(),
    merchantId: z.string().optional(),
    consumerId: z.string().optional(),
    purpose: z.string().optional(),
    transactionId: z.string().optional(),
    payerName: z.string().optional(),
    qrcId: z.string().optional(),
    iat: z.number().optional(),
    exp: z.number().optional(),
  })
  .passthrough()
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>

/* -------------------------------------------------------------------------- */
/*  Errors                                                                     */
/* -------------------------------------------------------------------------- */

export class TochkaApiError extends Error {
  readonly httpStatus: number
  readonly body: unknown
  constructor(httpStatus: number, message: string, body: unknown) {
    super(`[Tochka ${httpStatus}] ${message}`)
    this.name = 'TochkaApiError'
    this.httpStatus = httpStatus
    this.body = body
  }
}

export class TochkaServerError extends Error {
  readonly httpStatus: number
  readonly body: unknown
  constructor(httpStatus: number, body: unknown) {
    super(`[Tochka 5xx] ${httpStatus}`)
    this.name = 'TochkaServerError'
    this.httpStatus = httpStatus
    this.body = body
  }
}
