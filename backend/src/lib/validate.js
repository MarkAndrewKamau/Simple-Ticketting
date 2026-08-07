import { config } from '../config.js'

export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
    this.status = 400
  }
}

/**
 * Normalises Kenyan mobile numbers to 2547XXXXXXXX / 2541XXXXXXXX.
 * Mirrors frontend/src/lib/phone.js — the browser's answer is never trusted.
 */
export function normalizeKePhone(input) {
  const digits = String(input ?? '').replace(/\D/g, '')

  if (/^0(7|1)\d{8}$/.test(digits)) return `254${digits.slice(1)}`
  if (/^254(7|1)\d{8}$/.test(digits)) return digits
  if (/^(7|1)\d{8}$/.test(digits)) return `254${digits}`
  return null
}

/**
 * E.164 form (+254XXXXXXXXX) — what Paystack's mobile_money endpoint requires.
 *
 * The leading + is not optional here. Both the bare 254… and the local 07…
 * forms come back as "Invalid phone number format", so the value we store is
 * deliberately not the value we send.
 * https://paystack.com/docs/payments/payment-channels/
 */
export function toPaystackPhone(normalized) {
  return `+${normalized}`
}

export function parseCheckout(body) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Please send your booking details.')
  }

  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ')
  if (name.length < 3 || name.length > 80) {
    throw new ValidationError('Please give the full name of the parent or guardian.')
  }

  const phone = normalizeKePhone(body.phone)
  if (!phone) {
    throw new ValidationError('That phone number is not a valid Kenyan mobile number.')
  }

  let email = String(body.email ?? '').trim().toLowerCase()
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)) {
    throw new ValidationError('That email address does not look right.')
  }

  const quantity = Number(body.quantity)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > config.ticket.maxPerOrder) {
    throw new ValidationError(
      `Please choose between 1 and ${config.ticket.maxPerOrder} tickets. For a larger group, call us.`,
    )
  }

  // The client never sends an amount — we derive it from the fixed price so a
  // tampered request cannot buy a ticket for less.
  const amountCents = config.ticket.priceCents * quantity

  return { name, phone, email: email || null, quantity, amountCents }
}
