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

/** Is the flat family rate still on offer? Server clock only. */
export function isFamilyOfferActive(now = new Date()) {
  return now.getTime() <= config.ticket.offerEndsAt.getTime()
}

/**
 * Price for a booking, in cents.
 *
 * The family rate is flat regardless of headcount — a household of nine pays
 * the same as a household of three. We still record the headcount because the
 * school needs it for catering and seating.
 */
export function computeAmountCents({ ticketType, parents, children }) {
  if (ticketType === 'family') return config.ticket.familyCents
  return parents * config.ticket.parentCents + children * config.ticket.childCents
}

export function parseCheckout(body, now = new Date()) {
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

  const ticketType = String(body.ticketType ?? '')
  if (ticketType !== 'family' && ticketType !== 'per_head') {
    throw new ValidationError('Please choose either the family ticket or per-person pricing.')
  }

  // The expiry is enforced here, not in the browser. A stale tab, a wound-back
  // device clock, or a hand-crafted request must not buy the offer late.
  if (ticketType === 'family' && !isFamilyOfferActive(now)) {
    throw new ValidationError(
      'The family offer has now closed. Please choose per-person pricing to continue.',
    )
  }

  const parents = Number(body.parents)
  if (!Number.isInteger(parents) || parents < 1 || parents > config.ticket.maxParents) {
    throw new ValidationError(
      `Please enter between 1 and ${config.ticket.maxParents} parents or guardians.`,
    )
  }

  const children = Number(body.children)
  if (!Number.isInteger(children) || children < 0 || children > config.ticket.maxChildren) {
    throw new ValidationError(
      `Please enter up to ${config.ticket.maxChildren} children. For a larger group, call us.`,
    )
  }

  // The client never sends an amount — we derive it here so a tampered request
  // cannot buy a ticket for less.
  const amountCents = computeAmountCents({ ticketType, parents, children })

  return {
    name,
    phone,
    email: email || null,
    ticketType,
    parents,
    children,
    attendees: parents + children,
    amountCents,
  }
}
