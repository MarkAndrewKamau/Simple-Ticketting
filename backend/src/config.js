import 'dotenv/config'

function required(name) {
  const value = process.env[name]
  if (!value) {
    console.error(
      `\n  Missing required environment variable: ${name}\n` +
        `  Copy backend/.env.example to backend/.env and fill it in.\n`,
    )
    process.exit(1)
  }
  return value
}

function int(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.error(`\n  ${name} must be a positive integer (got "${raw}")\n`)
    process.exit(1)
  }
  return parsed
}

const secretKey = required('PAYSTACK_SECRET_KEY')
const mongoUri = required('MONGODB_URI')

if (!/^sk_(test|live)_/.test(secretKey)) {
  console.error(
    '\n  PAYSTACK_SECRET_KEY does not look like a secret key.\n' +
      '  It must start with sk_test_ or sk_live_ — a pk_ key will not work here.\n',
  )
  process.exit(1)
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: int('PORT', 4000),

  paystack: {
    secretKey,
    isLive: secretKey.startsWith('sk_live_'),
    // Overridable so the flow can be exercised against a mock. Leave unset
    // everywhere except tests.
    baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
  },

  // Amounts are held in the currency's minor unit (cents) end to end, so we
  // never do floating-point arithmetic on money.
  ticket: {
    priceKes: int('TICKET_PRICE_KES', 1500),
    get priceCents() {
      return this.priceKes * 100
    },
    maxPerOrder: int('MAX_TICKETS_PER_ORDER', 10),
    currency: 'KES',
  },

  mongo: {
    uri: mongoUri,
    dbName: process.env.MONGODB_DB_NAME || 'family_connection',
  },

  fallbackEmailDomain: process.env.FALLBACK_EMAIL_DOMAIN || 'guest.example.com',
  adminToken: process.env.ADMIN_TOKEN || '',

  allowedOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
}
