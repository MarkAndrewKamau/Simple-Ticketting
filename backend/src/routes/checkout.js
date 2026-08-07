import { Router } from 'express'
import { config } from '../config.js'
import { orders } from '../db.js'
import { parseCheckout, toPaystackPhone } from '../lib/validate.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { generateReference } from '../lib/reference.js'
import { chargeMobileMoney, PaystackError } from '../paystack.js'
import { toPublicOrder } from '../services/orderService.js'

const router = Router()

const TEN_MINUTES = 10 * 60 * 1000
// A double-tapped button should not ring the parent's phone twice.
const DUPLICATE_WINDOW_MS = 60 * 1000

// Deliberately loose. Kenyan mobile users sit behind carrier-grade NAT, so many
// unrelated parents can share one IP — this is here to stop a scripted flood,
// not to police individuals. The per-phone cap below is the real protection,
// because the phone owner is the one who gets harassed by repeated STK pushes.
const limitByIp = createRateLimiter({
  windowMs: TEN_MINUTES,
  max: 60,
  message: 'We are seeing an unusual number of requests. Please wait a few minutes and try again.',
})

const limitByPhone = createRateLimiter({
  windowMs: TEN_MINUTES,
  max: 4,
  message:
    'We have already sent several payment requests to this number. Please wait a few minutes, ' +
    'or call us on 0707 777 978 if the prompt is not arriving.',
})

router.post('/checkout', async (req, res, next) => {
  try {
    const ipCheck = limitByIp(req.ip)
    if (!ipCheck.allowed) {
      res.set('Retry-After', String(ipCheck.retryAfterSec))
      return res.status(429).json({ message: ipCheck.message })
    }

    const { name, phone, email, quantity, amountCents } = parseCheckout(req.body)

    const phoneCheck = limitByPhone(phone)
    if (!phoneCheck.allowed) {
      res.set('Retry-After', String(phoneCheck.retryAfterSec))
      return res.status(429).json({ message: phoneCheck.message })
    }

    // If a prompt is already sitting on this phone, hand back that order
    // instead of firing a second STK push at them.
    const inFlight = await orders.findRecentPending(phone, DUPLICATE_WINDOW_MS)
    if (inFlight && inFlight.quantity === quantity) {
      return res.status(200).json({
        ...toPublicOrder(inFlight),
        instruction: 'A payment request is already on your phone. Enter your M-Pesa PIN to confirm.',
      })
    }

    const reference = await generateReference()
    // Paystack requires an email on every charge; parents may not have given one.
    const chargeEmail = email || `${reference.toLowerCase()}@${config.fallbackEmailDomain}`

    await orders.create({
      reference,
      name,
      phone,
      email: chargeEmail,
      quantity,
      amountCents,
      currency: config.ticket.currency,
    })

    let charge
    try {
      charge = await chargeMobileMoney({
        reference,
        email: chargeEmail,
        amountCents,
        // Paystack wants E.164 (+254…) here, not the stored 254… form.
        phone: toPaystackPhone(phone),
        metadata: {
          parent_name: name,
          tickets: quantity,
          event: 'The Family Connection Experience',
          custom_fields: [
            { display_name: 'Parent / Guardian', variable_name: 'parent_name', value: name },
            { display_name: 'Tickets', variable_name: 'tickets', value: String(quantity) },
          ],
        },
      })
    } catch (err) {
      if (err instanceof PaystackError) {
        await orders.updateStatus(reference, 'failed', { message: err.message })
        // Log the whole response body, not just the message — Paystack often
        // puts the offending field in `data`/`meta`, and without it a rejection
        // costs a redeploy per guess to diagnose.
        console.error(
          `[checkout] charge failed for ${reference}: ${err.message}\n` +
            `  sent phone: ${toPaystackPhone(phone)} · amount: ${amountCents} ${config.ticket.currency}\n` +
            `  paystack response: ${JSON.stringify(err.details)}`,
        )
        return res.status(err.status).json({ message: err.message, reference })
      }
      throw err
    }

    // Paystack answers before the parent has touched their phone. Only an
    // outright rejection is final here; everything else stays pending.
    if (charge.status === 'failed') {
      const updated = await orders.updateStatus(reference, 'failed', {
        message: charge.message || charge.gateway_response || 'The payment request was declined.',
        paystackId: charge.id ? String(charge.id) : null,
      })
      return res.status(200).json(toPublicOrder(updated))
    }

    console.log(`[checkout] ${reference}: ${quantity} ticket(s) for ${phone} — STK push sent`)

    return res.status(201).json({
      ...toPublicOrder(await orders.find(reference)),
      instruction:
        charge.display_text ||
        'Check your phone and enter your M-Pesa PIN to complete the payment.',
    })
  } catch (err) {
    return next(err)
  }
})

export default router
