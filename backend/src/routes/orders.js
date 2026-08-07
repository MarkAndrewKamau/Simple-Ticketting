import { Router } from 'express'
import { timingSafeEqual } from 'node:crypto'
import { config } from '../config.js'
import { orders } from '../db.js'
import { reconcile, toPublicOrder } from '../services/orderService.js'

const router = Router()

// The browser polls every few seconds; do not forward every one of those to
// Paystack. The webhook is doing the real work in production anyway.
const VERIFY_THROTTLE_MS = 3000

function tokenMatches(provided) {
  if (!config.adminToken || !provided) return false
  const a = Buffer.from(config.adminToken)
  const b = Buffer.from(String(provided))
  return a.length === b.length && timingSafeEqual(a, b)
}

function requireAdmin(req, res, next) {
  const provided = req.get('x-admin-token') || req.query.token
  if (!tokenMatches(provided)) {
    return res.status(401).json({ message: 'Unauthorized.' })
  }
  return next()
}

/** Attendee list for the school. Must sit above /:reference to match first. */
router.get('/orders', requireAdmin, async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined
    const [rows, totals] = await Promise.all([
      orders.list({ status, limit: 1000 }),
      orders.summary(),
    ])

    return res.json({
      summary: {
        orders: totals.orders,
        ticketsPaid: totals.ticketsPaid,
        revenue: totals.revenueCents / 100,
        currency: config.ticket.currency,
      },
      orders: rows.map((o) => ({
        reference: o.reference,
        name: o.name,
        phone: o.phone,
        email: o.email,
        quantity: o.quantity,
        amount: o.amountCents / 100,
        status: o.status,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
      })),
    })
  } catch (err) {
    return next(err)
  }
})

router.get('/orders/:reference', async (req, res, next) => {
  try {
    const reference = String(req.params.reference).toUpperCase()
    let order = await orders.find(reference)

    if (!order) {
      return res.status(404).json({ message: 'We could not find that booking reference.' })
    }

    const checkedAt = order.lastCheckedAt ? order.lastCheckedAt.getTime() : 0
    const stale = Date.now() - checkedAt > VERIFY_THROTTLE_MS

    if (order.status === 'pending' && stale) {
      order = (await reconcile(reference)) || order
    }

    return res.json(toPublicOrder(order))
  } catch (err) {
    return next(err)
  }
})

export default router
