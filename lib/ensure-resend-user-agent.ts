// Must run before `import { Resend } from 'resend'` so the SDK reads this env at load time.
// Resend returns 403 / error 1010 if User-Agent is missing (some serverless runtimes strip it).
if (typeof process !== 'undefined' && process.env && !process.env.RESEND_USER_AGENT?.trim()) {
  process.env.RESEND_USER_AGENT = 'DeutschTest.pro/1.0'
}
