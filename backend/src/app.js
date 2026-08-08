import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { ping } from './db.js'
import { ValidationError, isFamilyOfferActive } from './lib/validate.js'
import { PaystackError } from './paystack.js'
import webhookRoutes from './routes/webhook.js'
import checkoutRoutes from './routes/checkout.js'
import orderRoutes from './routes/orders.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')

  // One hop (the platform's load balancer). Trusting every hop would let a
  // client spoof X-Forwarded-For and walk straight past the rate limiter.
  if (config.env === 'production') app.set('trust proxy', 1)

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin/curl requests arrive with no Origin header.
        if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true)
        return callback(new Error(`Origin ${origin} is not allowed.`))
      },
    }),
  )

  // Webhook first: it needs the raw bytes for signature verification.
  app.use('/api', webhookRoutes)

  app.use(express.json({ limit: '16kb' }))

  // Render polls this. Report unhealthy when the database is unreachable —
  // an API that cannot record a booking should not be taking traffic.
  app.get('/api/health', async (req, res) => {
    const base = {
      mode: config.paystack.isLive ? 'live' : 'test',
      currency: config.ticket.currency,
      pricing: {
        parent: config.ticket.parentCents / 100,
        child: config.ticket.childCents / 100,
        family: config.ticket.familyCents / 100,
      },
      familyOffer: {
        active: isFamilyOfferActive(),
        endsAt: config.ticket.offerEndsAt.toISOString(),
      },
    }
    try {
      await ping()
      return res.json({ ok: true, database: 'connected', ...base })
    } catch (err) {
      console.error('[health] database unreachable:', err.message)
      return res.status(503).json({ ok: false, database: 'unreachable', ...base })
    }
  })

  app.use('/api', checkoutRoutes)
  app.use('/api', orderRoutes)

  app.use((req, res) => {
    res.status(404).json({ message: 'Not found.' })
  })

  // eslint-disable-next-line no-unused-vars -- Express identifies handlers by arity
  app.use((err, req, res, next) => {
    if (err instanceof ValidationError) {
      return res.status(400).json({ message: err.message })
    }
    if (err instanceof PaystackError) {
      console.error('[paystack]', err.message, err.details ?? '')
      return res.status(err.status).json({ message: err.message })
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'That request was malformed.' })
    }
    if (/is not allowed/.test(err?.message || '')) {
      return res.status(403).json({ message: 'This origin is not allowed to use the API.' })
    }

    console.error('[error]', err)
    return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' })
  })

  return app
}
