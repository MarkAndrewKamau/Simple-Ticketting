# Backend — ticketing API

Express + Paystack + MongoDB. Charges a flat **KSh 1,500 per child** by M-Pesa
STK push and records every order in Atlas.

```bash
cd backend
npm install
cp .env.example .env      # Paystack SECRET key + Atlas connection string
npm run dev               # http://localhost:4000
npm test                  # 15 tests, mock Paystack + throwaway mongod
```

Needs **Node 20.19+** (24 recommended). `npm test` spins up its own local
`mongod` on a random port and never touches your Atlas cluster — set
`TEST_MONGODB_URI` to override if you have no local mongod.

## Routes

| Method | Route                    | Auth        | Purpose |
| ------ | ------------------------ | ----------- | ------- |
| GET    | `/api/health`            | —           | Liveness + DB ping; 503 when Mongo is unreachable |
| POST   | `/api/checkout`          | —           | Creates an order and fires the STK push |
| GET    | `/api/orders/:reference` | —           | Poll one order: `pending` \| `paid` \| `failed` \| `abandoned` |
| GET    | `/api/orders`            | admin token | Attendee list + totals |
| POST   | `/api/paystack/webhook`  | signature   | Paystack `charge.success` / `charge.failed` |

`POST /api/checkout` takes `{ name, phone, email?, quantity }` and returns
`{ reference, status, quantity, amount, currency, instruction }`.

```bash
curl -H "x-admin-token: $ADMIN_TOKEN" https://your-api.onrender.com/api/orders
```

## Data model

One collection, `orders`, keyed by a human-readable reference (`FCE-7K3M9Q` —
no confusable characters, because parents read it over the phone).

```js
{
  reference: 'FCE-7K3M9Q',
  name: 'Jane Wanjiru',
  phone: '254712345678',        // normalised on the way in
  email: 'jane@example.com',
  quantity: 2,
  amountCents: 300000,          // minor units end to end, never floats
  currency: 'KES',
  status: 'paid',               // pending | paid | failed | abandoned
  message: null,
  paystackId: '991234',
  paidAt: ISODate, createdAt: ISODate, updatedAt: ISODate, lastCheckedAt: ISODate
}
```

Indexes created at startup: unique on `reference`, plus `phone+createdAt`,
`status+createdAt`, and `createdAt` for the attendee list.

## How the money is protected

- **The client never sends an amount.** It sends `quantity`; the server
  multiplies by the configured price. Extra fields like `amount` in the request
  body are ignored — there is a test for exactly this.
- **Paid means Paystack said paid.** An order only reaches `paid` after the
  transaction's amount *and* currency match what was requested. A mismatch is
  logged loudly and failed for manual review rather than quietly honoured.
- **`paid` is terminal, atomically.** The status update is a single
  `findOneAndUpdate` filtered on `status != 'paid'`, so a webhook and a
  concurrent poll can race freely — Mongo settles it, and a late `charge.failed`
  can never walk a paid order back.
- **Webhooks are verified** with a constant-time HMAC-SHA512 check over the raw
  request bytes. Forged calls get a 401 and change nothing.
- **STK pushes are rate limited per phone number** (4 per 10 minutes), because
  the abuse case is using this endpoint to make a stranger's phone ring. The
  per-IP cap is deliberately loose — Kenyan mobile users share carrier NAT
  addresses, and a tight IP cap would lock out real parents.
- A repeat submission within 60 seconds reuses the in-flight order instead of
  sending a second prompt.

## Webhook setup

The browser polls `verify` as a fallback, so **local development works with no
webhook at all**. In production:

> Paystack Dashboard → Settings → API Keys & Webhooks → Webhook URL
> `https://your-api.onrender.com/api/paystack/webhook`

To test webhooks locally, expose the port (`ngrok http 4000`) and use that URL.

## Notes for Render

- **Free instances sleep after 15 minutes idle.** The first request then takes
  ~50 seconds to wake the service — with a parent sitting on the payment button.
  Use a paid instance for the event, or keep it warm by pinging `/api/health`.
- `trust proxy` is set to `1` in production so the rate limiter sees the real
  client IP through Render's load balancer, and no further.
- Health checks hit `/api/health`, which pings Mongo — the service reports
  unhealthy rather than accepting bookings it cannot record.
