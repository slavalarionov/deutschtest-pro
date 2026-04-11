import { randomInt } from 'crypto'

const PASSWORD_CHARSET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'

/** Cryptographically secure password for server-side registration (e.g. API routes). */
export function generateSecurePassword(length = 12): string {
  let password = ''
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARSET[randomInt(PASSWORD_CHARSET.length)]
  }
  return password
}
