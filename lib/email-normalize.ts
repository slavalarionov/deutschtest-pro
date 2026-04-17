/**
 * Сводит email к каноничному виду для проверки «уже зарегистрирован?».
 * Gmail/Googlemail игнорируют точки и `+tag` в local-part, поэтому
 * `j.ohn.doe+spam@gmail.com` и `johndoe@gmail.com` — один и тот же ящик,
 * но стандартная уникальность в auth.users сравнивает строки побайтово.
 *
 * Применяем только к Gmail — для остальных провайдеров dot/plus-aliasing
 * не гарантируется, и нормализация может схлопнуть разные реальные адреса.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const atIdx = trimmed.lastIndexOf('@')
  if (atIdx <= 0 || atIdx === trimmed.length - 1) return trimmed

  const local = trimmed.slice(0, atIdx)
  const domain = trimmed.slice(atIdx + 1)

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const cleaned = local.split('+')[0].replace(/\./g, '')
    return `${cleaned}@gmail.com`
  }

  return `${local}@${domain}`
}
