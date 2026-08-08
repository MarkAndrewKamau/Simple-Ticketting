import { orders } from '../db.js'
import { config } from '../config.js'
import { verifyTransaction, mapStatus, PaystackError } from '../paystack.js'

const TERMINAL = new Set(['paid', 'failed', 'abandoned'])

/**
 * Applies a Paystack transaction object to an order.
 *
 * Both the webhook and the polling path funnel through here so there is exactly
 * one place that decides an order is paid — and it only does so after checking
 * that the money Paystack received matches what we asked for.
 */
export async function applyTransaction(order, tx, source) {
  const mapped = mapStatus(tx?.status)

  if (mapped === 'paid') {
    const amountMatches = Number(tx.amount) === Number(order.amountCents)
    const currencyMatches = String(tx.currency).toUpperCase() === config.ticket.currency

    if (!amountMatches || !currencyMatches) {
      // Should be impossible via our own charge call, so make it loud rather
      // than silently handing out tickets for the wrong amount.
      console.error(
        `[orders] AMOUNT MISMATCH on ${order.reference} (${source}): ` +
          `expected ${order.amountCents} ${config.ticket.currency}, got ${tx.amount} ${tx.currency}`,
      )
      return orders.updateStatus(order.reference, 'failed', {
        message:
          'The amount received did not match this booking. Please contact us on 0745 418 065 and quote your reference.',
        paystackId: tx.id ? String(tx.id) : null,
      })
    }

    console.log(`[orders] ${order.reference} paid (${source})`)
    return orders.updateStatus(order.reference, 'paid', {
      message: null,
      paystackId: tx.id ? String(tx.id) : null,
    })
  }

  if (mapped === 'pending') {
    await orders.markChecked(order.reference)
    return orders.find(order.reference)
  }

  return orders.updateStatus(order.reference, mapped, {
    message:
      tx?.gateway_response ||
      'The payment was not completed. No money has left your account — you can try again.',
    paystackId: tx?.id ? String(tx.id) : null,
  })
}

/**
 * Brings an order up to date with Paystack.
 *
 * The webhook is the primary signal, but it needs a public URL. Polling with
 * verify keeps everything working in local development and covers the case
 * where a webhook delivery is dropped.
 */
export async function reconcile(reference) {
  const order = await orders.find(reference)
  if (!order) return null
  if (TERMINAL.has(order.status)) return order

  try {
    const tx = await verifyTransaction(reference)
    return await applyTransaction(order, tx, 'verify')
  } catch (err) {
    if (err instanceof PaystackError) {
      // Paystack 404s a reference until the charge is registered on their side.
      // Leave the order pending and let the next poll decide.
      console.warn(`[orders] verify failed for ${reference}: ${err.message}`)
      await orders.markChecked(reference)
      return orders.find(reference)
    }
    throw err
  }
}

/** Shape sent to the browser — never leak internal fields. */
export function toPublicOrder(order) {
  return {
    reference: order.reference,
    status: order.status,
    ticketType: order.ticketType,
    parents: order.parents,
    children: order.children,
    attendees: order.attendees,
    amount: order.amountCents / 100,
    currency: order.currency,
    message: order.message || undefined,
    paidAt: order.paidAt || undefined,
  }
}
