// server-only — classifies errors from AI provider calls for ai_usage_log.status.
// Matches the CHECK constraint in migration 021.

import { z } from 'zod'

export type AiUsageStatus =
  | 'success'
  | 'error'
  | 'timeout'
  | 'rate_limit'
  | 'invalid_response'
  | 'insufficient_balance'

// Anthropic returns invalid_request_error (HTTP 400) with a message about
// "credit balance" when the account is out of funds. This is actionable signal
// ("top up the balance"), not a code bug — we split it out from generic 'error'
// so the admin dashboard can surface it distinctly.
function looksLikeInsufficientBalance(msg: string): boolean {
  return (
    msg.includes('credit balance') ||
    msg.includes('insufficient_balance') ||
    (msg.includes('invalid_request_error') && msg.includes('balance'))
  )
}

export function classifyError(err: unknown): Exclude<AiUsageStatus, 'success'> {
  if (err instanceof z.ZodError) return 'invalid_response'

  const rawMsg = err instanceof Error ? err.message : String(err ?? '')
  const msg = rawMsg.toLowerCase()

  if (looksLikeInsufficientBalance(msg)) return 'insufficient_balance'
  if (msg.includes('rate_limit') || msg.includes('429')) return 'rate_limit'
  if (msg.includes('timeout') || msg.includes('etimedout') || msg.includes('aborted')) return 'timeout'

  return 'error'
}
