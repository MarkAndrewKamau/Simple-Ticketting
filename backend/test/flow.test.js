/**
 * End-to-end exercise of the ticketing flow against a mock Paystack and a
 * throwaway MongoDB.
 *
 *   npm test
 *
 * Nothing here touches the real Paystack API, a real phone, or your Atlas
 * cluster. Requires `mongod` on PATH, or set TEST_MONGODB_URI to point at a
 * scratch database (its `orders` collection is dropped before each run).
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import net from 'node:net'

const SECRET = 'sk_test_mock_secret_key_for_tests'
const dataDir = mkdtempSync(join(tmpdir(), 'fce-test-'))

// Throwaway mongod ---------------------------------------------------------
let mongod = null

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

async function waitForPort(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const open = await new Promise((resolve) => {
      const socket = net.connect({ port, host: '127.0.0.1' })
      const done = (result) => {
        socket.destroy()
        resolve(result)
      }
      socket.once('connect', () => done(true))
      socket.once('error', () => done(false))
      setTimeout(() => done(false), 400)
    })
    if (open) return
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`mongod did not start on port ${port} in time`)
}

async function startMongo() {
  if (process.env.TEST_MONGODB_URI) return process.env.TEST_MONGODB_URI

  const port = await freePort()
  const dbDir = join(dataDir, 'mongo')
  rmSync(dbDir, { recursive: true, force: true })
  const { mkdirSync } = await import('node:fs')
  mkdirSync(dbDir, { recursive: true })

  mongod = spawn(
    'mongod',
    [
      '--dbpath', dbDir,
      '--port', String(port),
      '--bind_ip', '127.0.0.1',
      '--wiredTigerCacheSizeGB', '0.25',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  mongod.stderr.on('data', (chunk) => console.error('[mongod]', chunk.toString().trim()))
  mongod.on('error', (err) => {
    console.error('Could not start mongod:', err.message)
  })

  await waitForPort(port)
  return `mongodb://127.0.0.1:${port}`
}

// Mock Paystack ------------------------------------------------------------
const mock = {
  charges: new Map(),
  chargedPhones: [],
  nextChargeStatus: 'pay_offline',
  failCharge: null,
}

const paystack = http.createServer((req, res) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}
    res.setHeader('Content-Type', 'application/json')

    if (req.url === '/charge' && req.method === 'POST') {
      if (mock.failCharge) {
        res.writeHead(400)
        return res.end(JSON.stringify({ status: false, message: mock.failCharge }))
      }
      // Real Paystack requires E.164 here — the leading + is not optional.
      if (!/^\+254(7|1)\d{8}$/.test(body.mobile_money?.phone ?? '')) {
        res.writeHead(400)
        return res.end(JSON.stringify({ status: false, message: 'Invalid phone number format' }))
      }
      mock.chargedPhones.push(body.mobile_money.phone)
      mock.charges.set(body.reference, {
        id: 991234,
        reference: body.reference,
        amount: body.amount,
        currency: body.currency,
        status: 'pending',
      })
      return res.end(
        JSON.stringify({
          status: true,
          data: {
            reference: body.reference,
            status: mock.nextChargeStatus,
            display_text: 'Please complete the authorization process on your mobile phone',
          },
        }),
      )
    }

    if (req.url.startsWith('/transaction/verify/')) {
      const ref = decodeURIComponent(req.url.split('/').pop())
      const charge = mock.charges.get(ref)
      if (!charge) {
        res.writeHead(404)
        return res.end(JSON.stringify({ status: false, message: 'Transaction not found' }))
      }
      return res.end(JSON.stringify({ status: true, data: charge }))
    }

    res.writeHead(404)
    return res.end(JSON.stringify({ status: false, message: 'not mocked' }))
  })
})

let api
let baseUrl

let disconnectDb

before(async () => {
  await new Promise((r) => paystack.listen(0, r))
  const mockPort = paystack.address().port
  const mongoUri = await startMongo()

  process.env.PAYSTACK_SECRET_KEY = SECRET
  process.env.PAYSTACK_BASE_URL = `http://127.0.0.1:${mockPort}`
  process.env.MONGODB_URI = mongoUri
  process.env.MONGODB_DB_NAME = 'family_connection_test'
  process.env.ADMIN_TOKEN = 'test-admin-token-0123456789'
  process.env.NODE_ENV = 'test'
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173'
  // Far future so the family offer is live for most tests; the expiry itself
  // is covered directly against parseCheckout with an injected clock.
  process.env.OFFER_ENDS_AT = '2099-01-01T00:00:00+03:00'

  const { connect, disconnect } = await import('../src/db.js')
  const db = await connect()
  await db.collection('orders').deleteMany({}) // start from a clean sheet
  disconnectDb = disconnect

  const { createApp } = await import('../src/app.js')
  api = createApp().listen(0)
  await new Promise((r) => api.once('listening', r))
  baseUrl = `http://127.0.0.1:${api.address().port}`
})

after(async () => {
  api?.close()
  paystack.close()
  await disconnectDb?.()
  mongod?.kill('SIGTERM')
  rmSync(dataDir, { recursive: true, force: true })
})

const post = (path, body, headers = {}) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

const get = (path, headers = {}) => fetch(`${baseUrl}${path}`, { headers })

const perHead = (over = {}) => ({
  name: 'Jane Wanjiru',
  phone: '0712345678',
  ticketType: 'per_head',
  parents: 2,
  children: 1,
  ...over,
})

const family = (over = {}) => ({ ...perHead(), ticketType: 'family', ...over })

const validBooking = perHead()

// Tests --------------------------------------------------------------------

test('health reports test mode, pricing and offer state', async () => {
  const res = await get('/api/health')
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.mode, 'test')
  assert.deepEqual(body.pricing, { parent: 1000, child: 500, family: 2500 })
  assert.equal(body.familyOffer.active, true)
})

test('per-head checkout charges 1000 per parent and 500 per child', async () => {
  const res = await post('/api/checkout', validBooking) // 2 parents, 1 child
  assert.equal(res.status, 201)

  const body = await res.json()
  assert.equal(body.status, 'pending')
  assert.equal(body.ticketType, 'per_head')
  assert.equal(body.parents, 2)
  assert.equal(body.children, 1)
  assert.equal(body.attendees, 3)
  assert.equal(body.amount, 2500) // 2×1000 + 1×500
  assert.equal(body.currency, 'KES')
  assert.match(body.reference, /^FCE-[2-9A-Z]{6}$/)

  // The charge that reached Paystack must be in cents.
  assert.equal(mock.charges.get(body.reference).amount, 250000)
})

test('the family ticket is flat however large the family', async () => {
  const small = await (await post('/api/checkout', family({ phone: '0700000001', parents: 1, children: 1 }))).json()
  const huge = await (await post('/api/checkout', family({ phone: '0700000002', parents: 2, children: 9 }))).json()

  assert.equal(small.amount, 2500)
  assert.equal(huge.amount, 2500)
  assert.equal(huge.attendees, 11)
  assert.equal(mock.charges.get(huge.reference).amount, 250000)
})

test('a client-supplied amount cannot change what is charged', async () => {
  const res = await post('/api/checkout', {
    ...perHead({ phone: '0722000111', parents: 3, children: 4 }),
    amount: 1,
    amountCents: 1,
    price: 1,
  })
  const body = await res.json()
  assert.equal(body.amount, 5000) // 3×1000 + 4×500, not 1
  assert.equal(mock.charges.get(body.reference).amount, 500000)
})

test('bad input is rejected with a readable message', async () => {
  const cases = [
    [{ ...validBooking, phone: '12345' }, /Kenyan mobile/],
    [{ ...validBooking, name: 'Jo' }, /full name/],
    [{ ...validBooking, ticketType: 'free' }, /family ticket or per-person/],
    [{ ...validBooking, ticketType: undefined }, /family ticket or per-person/],
    [{ ...validBooking, parents: 0 }, /between 1 and 10 parents/],
    [{ ...validBooking, parents: 99 }, /between 1 and 10 parents/],
    [{ ...validBooking, parents: 1.5 }, /between 1 and 10 parents/],
    [{ ...validBooking, children: -1 }, /up to 20 children/],
    [{ ...validBooking, children: 99 }, /up to 20 children/],
    [{ ...validBooking, email: 'not-an-email' }, /email/],
  ]

  for (const [payload, expected] of cases) {
    const res = await post('/api/checkout', payload)
    assert.equal(res.status, 400, JSON.stringify(payload))
    assert.match((await res.json()).message, expected)
  }
})

test('the family rate is refused once the offer has closed', async () => {
  const { parseCheckout, computeAmountCents, isFamilyOfferActive } = await import(
    '../src/lib/validate.js'
  )
  const afterDeadline = new Date('2099-01-02T00:00:00+03:00')
  const beforeDeadline = new Date('2098-12-31T00:00:00+03:00')

  assert.equal(isFamilyOfferActive(beforeDeadline), true)
  assert.equal(isFamilyOfferActive(afterDeadline), false)

  // Same request, only the clock differs.
  assert.equal(parseCheckout(family(), beforeDeadline).amountCents, 250000)
  assert.throws(
    () => parseCheckout(family(), afterDeadline),
    /family offer has now closed/,
    'an expired offer must not be purchasable',
  )

  // Per-head pricing keeps working after the deadline.
  assert.equal(parseCheckout(perHead(), afterDeadline).amountCents, 250000)
  assert.equal(computeAmountCents({ ticketType: 'per_head', parents: 1, children: 0 }), 100000)
})

test('any way of writing the number reaches Paystack as E.164 +254…', async () => {
  mock.chargedPhones.length = 0

  for (const phone of ['0733111222', '254733111222', '+254 733 111 222', '733111222']) {
    const res = await post('/api/checkout', perHead({ name: 'Mary Achieng', phone, parents: 1, children: 0 }))
    const body = await res.json()
    assert.equal(body.status, 'pending', `${phone} → ${body.status}`)
  }

  // Paystack rejects both the bare 254… and the local 07… forms outright.
  assert.deepEqual([...new Set(mock.chargedPhones)], ['+254733111222'])

  const res = await get('/api/orders?token=test-admin-token-0123456789')
  const { orders } = await res.json()
  const normalised = orders.filter((o) => o.name === 'Mary Achieng').map((o) => o.phone)
  assert.deepEqual([...new Set(normalised)], ['254733111222'])
})

test('a double-tapped booking reuses the in-flight order', async () => {
  const first = await (await post('/api/checkout', perHead({ name: 'Sam Kiptoo', phone: '0700111222', parents: 2, children: 2 }))).json()
  const second = await (await post('/api/checkout', perHead({ name: 'Sam Kiptoo', phone: '0700111222', parents: 2, children: 2 }))).json()

  assert.equal(second.reference, first.reference)
  assert.match(second.instruction, /already on your phone/)
})

test('polling reflects a successful payment via verify', async () => {
  const order = await (await post('/api/checkout', perHead({ name: 'Grace Mumo', phone: '0711333444', parents: 1, children: 0 }))).json()

  const pending = await (await get(`/api/orders/${order.reference}`)).json()
  assert.equal(pending.status, 'pending')

  mock.charges.get(order.reference).status = 'success'
  await new Promise((r) => setTimeout(r, 3100)) // clear the verify throttle

  const paid = await (await get(`/api/orders/${order.reference}`)).json()
  assert.equal(paid.status, 'paid')
  assert.ok(paid.paidAt)
})

test('an underpaid transaction is never marked paid', async () => {
  const order = await (await post('/api/checkout', perHead({ name: 'Ali Hassan', phone: '0798777666', parents: 2, children: 0 }))).json()

  const charge = mock.charges.get(order.reference)
  charge.status = 'success'
  charge.amount = 100 // KSh 1 instead of KSh 2,000
  await new Promise((r) => setTimeout(r, 3100))

  const result = await (await get(`/api/orders/${order.reference}`)).json()
  assert.equal(result.status, 'failed')
  assert.match(result.message, /did not match/)
})

test('webhook with a valid signature marks the order paid', async () => {
  const order = await (await post('/api/checkout', perHead({ name: 'Ruth Njeri', phone: '0755222333', parents: 1, children: 0 }))).json()

  const payload = JSON.stringify({
    event: 'charge.success',
    data: { reference: order.reference, status: 'success', amount: 100000, currency: 'KES', id: 42 },
  })
  const signature = createHmac('sha512', SECRET).update(payload).digest('hex')

  const res = await fetch(`${baseUrl}/api/paystack/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
    body: payload,
  })
  assert.equal(res.status, 200)

  await new Promise((r) => setTimeout(r, 50))
  const status = await (await get(`/api/orders/${order.reference}`)).json()
  assert.equal(status.status, 'paid')
})

test('webhook with a forged signature changes nothing', async () => {
  const order = await (await post('/api/checkout', perHead({ name: 'Fake Payer', phone: '0766444555', parents: 1, children: 0 }))).json()

  const payload = JSON.stringify({
    event: 'charge.success',
    data: { reference: order.reference, status: 'success', amount: 100000, currency: 'KES' },
  })

  const res = await fetch(`${baseUrl}/api/paystack/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'deadbeef' },
    body: payload,
  })
  assert.equal(res.status, 401)

  const status = await (await get(`/api/orders/${order.reference}`)).json()
  assert.equal(status.status, 'pending')
})

test('a paid order cannot be walked back by a later failure', async () => {
  const order = await (await post('/api/checkout', perHead({ name: 'Paid Once', phone: '0744888999', parents: 1, children: 0 }))).json()

  mock.charges.get(order.reference).status = 'success'
  await new Promise((r) => setTimeout(r, 3100))
  assert.equal((await (await get(`/api/orders/${order.reference}`)).json()).status, 'paid')

  const payload = JSON.stringify({
    event: 'charge.failed',
    data: { reference: order.reference, status: 'failed', amount: 100000, currency: 'KES' },
  })
  const signature = createHmac('sha512', SECRET).update(payload).digest('hex')
  await fetch(`${baseUrl}/api/paystack/webhook`, {
    method: 'POST',
    headers: { 'x-paystack-signature': signature },
    body: payload,
  })

  await new Promise((r) => setTimeout(r, 50))
  assert.equal((await (await get(`/api/orders/${order.reference}`)).json()).status, 'paid')
})

test('a Paystack rejection surfaces as a readable failure', async () => {
  mock.failCharge = 'Invalid phone number for mobile money'
  const res = await post('/api/checkout', perHead({ name: 'Rejected Parent', phone: '0788111000', parents: 1, children: 0 }))
  mock.failCharge = null

  assert.equal(res.status, 502)
  const body = await res.json()
  assert.match(body.message, /Invalid phone number/)

  const order = await (await get(`/api/orders/${body.reference}`)).json()
  assert.equal(order.status, 'failed')
})

test('unknown references 404', async () => {
  const res = await get('/api/orders/FCE-NOPE22')
  assert.equal(res.status, 404)
})

test('the attendee list requires the admin token', async () => {
  assert.equal((await get('/api/orders')).status, 401)
  assert.equal((await get('/api/orders', { 'x-admin-token': 'wrong' })).status, 401)

  const res = await get('/api/orders', { 'x-admin-token': 'test-admin-token-0123456789' })
  assert.equal(res.status, 200)

  const body = await res.json()
  assert.ok(body.summary.attendeesPaid >= 1)
  assert.ok(body.summary.parentsPaid >= 1)
  assert.ok(body.summary.revenue > 0)
})

test('repeated pushes to one phone are rate limited', async () => {
  const phone = '0799000111'
  const codes = []
  for (let i = 0; i < 6; i += 1) {
    // Vary the headcount so the duplicate-order guard does not absorb these.
    const res = await post('/api/checkout', perHead({ name: 'Spam Target', phone, children: i }))
    codes.push(res.status)
  }
  assert.ok(codes.includes(429), `expected a 429 in ${codes}`)
})
