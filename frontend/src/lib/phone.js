/**
 * Normalises Kenyan mobile numbers to the 2547XXXXXXXX / 2541XXXXXXXX form
 * Paystack expects. Returns null when the number is not a valid KE mobile.
 */
export function normalizeKePhone(input) {
  const digits = String(input || '').replace(/\D/g, '')

  let local
  if (/^0(7|1)\d{8}$/.test(digits)) local = digits.slice(1)
  else if (/^254(7|1)\d{8}$/.test(digits)) local = digits.slice(3)
  else if (/^(7|1)\d{8}$/.test(digits)) local = digits
  else return null

  return `254${local}`
}

/** Pretty display form: 0745 418 065 */
export function formatKePhone(input) {
  const normalized = normalizeKePhone(input)
  if (!normalized) return input
  const local = `0${normalized.slice(3)}`
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
}
