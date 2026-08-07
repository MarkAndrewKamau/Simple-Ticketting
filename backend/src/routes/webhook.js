import { Router } from 'express'
import express from 'express'
import { orders } from '../db.js'
import { isValidWebhookSignature } from '../paystack.js'
import { applyTransaction } from '../services/orderService.js'

const router = Router()

/**
 * Paystack webhook. The signature is computed over the exact bytes Paystack
 * sent, so this route takes the raw body — it must be registered before any
 * JSON body parser touches the request.
 */
router.post('/paystack/webhook', express.raw({ type: '*/*' }), (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('')

  if (!isValidWebhookSignature(raw, req.get('x-paystack-signature'))) {
    console.warn('[webhook] rejected: bad signature')
    return res.sendStatus(401)
  }

  // Signature is good — acknowledge immediately so Paystack does not retry
  // while we work, then process.
  res.sendStatus(200)

  let payload
  try {
    payload = JSON.parse(raw.toString('utf8'))
  } catch {
    console.error('[webhook] signed payload was not valid JSON')
    return undefined
  }

  const { event, data } = payload || {}
  if (!data?.reference) return undefined

  if (event !== 'charge.success' && event !== 'charge.failed') {
    console.log(`[webhook] ignoring ${event} for ${data.reference}`)
    return undefined
  }

  // The response has already gone out, so this runs detached — anything that
  // throws here must be logged or it disappears silently.
  process(String(data.reference), data, event).catch((err) => {
    console.error(`[webhook] failed to apply ${event} for ${data.reference}:`, err)
  })

  return undefined
})

async function process(reference, data, event) {
  const order = await orders.find(reference)
  if (!order) {
    console.warn(`[webhook] ${event} for unknown reference ${reference}`)
    return
  }
  await applyTransaction(order, data, `webhook:${event}`)
}

export default router
