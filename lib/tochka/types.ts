import { z } from 'zod'

/* -------------------------------------------------------------------------- */
/*  Create Payment — flat Data, no Operation[] wrapper                         */
/* -------------------------------------------------------------------------- */

export const TochkaPaymentModeSchema = z.enum(['card', 'sbp', 'dolyame', 'tinkoff'])
export type TochkaPaymentMode = z.infer<typeof TochkaPaymentModeSchema>

export interface CreatePaymentRequest {
  amountMinor: number
  purpose: string
  paymentMode: TochkaPaymentMode[]
  redirectUrl: string
  failRedirectUrl?: string
  clientEmail?: string
}

export const CreatePaymentResponseSchema = z.object({
  Data: z
    .object({
      operationId: z.string().min(1),
      paymentLink: z.string().url(),
      status: z.string().optional(),
      amount: z.string().optional(),
      purpose: z.string().optional(),
    })
    .passthrough(),
  Links: z.object({ self: z.string().url() }).optional(),
})
export type CreatePaymentResponse = z.infer<typeof CreatePaymentResponseSchema>

/* -------------------------------------------------------------------------- */
/*  Get Payment Info — also flat Data                                          */
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
/*  Webhook payload (decoded JWT body)                                         */
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
