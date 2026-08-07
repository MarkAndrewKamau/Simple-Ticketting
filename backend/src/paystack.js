import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from './config.js'

const TIMEOUT_MS = 25000

export class PaystackError extends Error {
  constructor(message, { status = 502, details = null } = {}) {
    super(message)
    this.name = 'PaystackError'
    this.status = status
    this.details = details
  }
}

async function call(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${config.paystack.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.paystack.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    throw new PaystackError(
      'We could not reach the payment service. Please check your connection and try again.',
      { details: err.message },
    )
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    throw new PaystackError('The payment service sent an unreadable response.', {
      details: `HTTP ${response.status}`,
    })
  }

  if (!response.ok || payload?.status === false) {
    // Paystack's own message is usually parent-readable ("Invalid phone number").
    throw new PaystackError(payload?.message || 'The payment service rejected the request.', {
      status: response.status === 401 ? 500 : 502,
      details: payload,
    })
  }

  return payload.data
}

/**
 * Fires the M-Pesa STK push. Paystack answers immediately with a non-final
 * status (usually `pay_offline`) — the prompt is already on the parent's phone
 * and the real outcome arrives by webhook or by verify().
 */
export function chargeMobileMoney({ reference, email, amountCents, phone, metadata }) {
  return call('/charge', {
    method: 'POST',
    body: {
      reference,
      email,
      amount: amountCents,
      currency: config.ticket.currency,
      mobile_money: { phone, provider: 'mpesa' },
      metadata,
    },
  })
}

/** Authoritative status lookup for a reference. */
export function verifyTransaction(reference) {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`)
}

/** Constant-time check of the x-paystack-signature header against the raw body. */
export function isValidWebhookSignature(rawBody, signature) {
  if (!signature || typeof signature !== 'string') return false

  const expected = createHmac('sha512', config.paystack.secretKey).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')

  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Maps a Paystack transaction status onto one of our four order states.
 * Anything we do not recognise stays `pending` so a poll tries again.
 */
export function mapStatus(paystackStatus) {
  switch (paystackStatus) {
    case 'success':
      return 'paid'
    case 'failed':
    case 'reversed':
      return 'failed'
    case 'abandoned':
      return 'abandoned'
    default:
      return 'pending'
  }
}
