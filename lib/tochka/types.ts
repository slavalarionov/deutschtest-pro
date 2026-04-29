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

export const PaymentOperationSchema = z.object({
  amount: z.string(),
  purpose: z.string().min(1).max(140),
  paymentMode: z.array(TochkaPaymentModeSchema).min(1),
  redirectUrl: z.string().url(),
  failRedirectUrl: z.string().url().optional(),
  Items: z.array(ReceiptItemSchema).min(1),
  Client: z.object({ email: z.string().email() }),
})
export type PaymentOperation = z.infer<typeof PaymentOperationSchema>

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
 * Response for both `payments` and `payments_with_receipt` — Tochka returns
 * the same shape: `Data.Operation[].operationId` + `Data.Operation[].paymentLink`.
 */
export const CreatePaymentResponseSchema = z.object({
  Data: z
    .object({
      Operation: z
        .array(
          z
            .object({
              operationId: z.string().min(1),
              paymentLink: z.string().url(),
              status: z.string().optional(),
              amount: z.string().optional(),
              purpose: z.string().optional(),
            })
            .passthrough(),
        )
        .min(1),
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

export const PaymentInfoResponseSchema = z
  .object({
    Data: z
      .object({
        operationId: z.string(),
        status: TochkaPaymentStatusSchema,
        amount: z.string(),
        purpose: z.string().optional(),
        paymentMode: z.array(z.string()).optional(),
        paymentType: z.string().optional(),
        paymentLink: z.string().url().optional(),
        createdAt: z.string().optional(),
      })
      .passthrough(),
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
    amount: z.string().optional(),
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
