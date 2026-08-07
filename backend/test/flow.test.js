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
const mock = { charges: new Map(), nextChargeStatus: 'pay_offline', failCharge: null }

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

const validBooking = { name: 'Jane Wanjiru', phone: '0712345678', quantity: 2 }

// Tests --------------------------------------------------------------------

test('health reports test mode and the ticket price', async () => {
  const res = await get('/api/health')
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.mode, 'test')
  assert.equal(body.ticketPrice, 1500)
})

test('checkout creates a pending order priced server-side', async () => {
  const res = await post('/api/checkout', validBooking)
  assert.equal(res.status, 201)

  const body = await res.json()
  assert.equal(body.status, 'pending')
  assert.equal(body.quantity, 2)
  assert.equal(body.amount, 3000)
  assert.equal(body.currency, 'KES')
  assert.match(body.reference, /^FCE-[2-9A-Z]{6}$/)
  assert.match(body.instruction, /mobile phone/)

  // The charge that reached Paystack must be in cents.
  assert.equal(mock.charges.get(body.reference).amount, 300000)
})

test('a client-supplied amount cannot change what is charged', async () => {
  const res = await post('/api/checkout', {
    name: 'Peter Otieno',
    phone: '0722000111',
    quantity: 1,
    amount: 1,
    amountCents: 1,
    price: 1,
  })
  const body = await res.json()
  assert.equal(body.amount, 1500)
  assert.equal(mock.charges.get(body.reference).amount, 150000)
})

test('bad input is rejected with a readable message', async () => {
  const cases = [
    [{ ...validBooking, phone: '12345' }, /Kenyan mobile/],
    [{ ...validBooking, name: 'Jo' }, /full name/],
    [{ ...validBooking, quantity: 0 }, /between 1 and 10/],
    [{ ...validBooking, quantity: 99 }, /between 1 and 10/],
    [{ ...validBooking, quantity: 1.5 }, /between 1 and 10/],
    [{ ...validBooking, email: 'not-an-email' }, /email/],
  ]

  for (const [payload, expected] of cases) {
    const res = await post('/api/checkout', payload)
    assert.equal(res.status, 400, JSON.stringify(payload))
    assert.match((await res.json()).message, expected)
  }
})

test('phone numbers normalise to the 254 form Paystack expects', async () => {
  for (const phone of ['0733111222', '254733111222', '+254 733 111 222', '733111222']) {
    const res = await post('/api/checkout', { name: 'Mary Achieng', phone, quantity: 1 })
    const body = await res.json()
    assert.ok(['pending'].includes(body.status), `${phone} → ${body.status}`)
  }

  const res = await get('/api/orders?token=test-admin-token-0123456789')
  const { orders } = await res.json()
  const normalised = orders.filter((o) => o.name === 'Mary Achieng').map((o) => o.phone)
  assert.deepEqual([...new Set(normalised)], ['254733111222'])
})

test('a double-tapped booking reuses the in-flight order', async () => {
  const first = await (await post('/api/checkout', { name: 'Sam Kiptoo', phone: '0700111222', quantity: 3 })).json()
  const second = await (await post('/api/checkout', { name: 'Sam Kiptoo', phone: '0700111222', quantity: 3 })).json()

  assert.equal(second.reference, first.reference)
  assert.match(second.instruction, /already on your phone/)
})

test('polling reflects a successful payment via verify', async () => {
  const order = await (await post('/api/checkout', { name: 'Grace Mumo', phone: '0711333444', quantity: 1 })).json()

  const pending = await (await get(`/api/orders/${order.reference}`)).json()
  assert.equal(pending.status, 'pending')

  mock.charges.get(order.reference).status = 'success'
  await new Promise((r) => setTimeout(r, 3100)) // clear the verify throttle

  const paid = await (await get(`/api/orders/${order.reference}`)).json()
  assert.equal(paid.status, 'paid')
  assert.ok(paid.paidAt)
})

test('an underpaid transaction is never marked paid', async () => {
  const order = await (await post('/api/checkout', { name: 'Ali Hassan', phone: '0798777666', quantity: 2 })).json()

  const charge = mock.charges.get(order.reference)
  charge.status = 'success'
  charge.amount = 100 // KSh 1 instead of KSh 3,000
  await new Promise((r) => setTimeout(r, 3100))

  const result = await (await get(`/api/orders/${order.reference}`)).json()
  assert.equal(result.status, 'failed')
  assert.match(result.message, /did not match/)
})

test('webhook with a valid signature marks the order paid', async () => {
  const order = await (await post('/api/checkout', { name: 'Ruth Njeri', phone: '0755222333', quantity: 1 })).json()

  const payload = JSON.stringify({
    event: 'charge.success',
    data: { reference: order.reference, status: 'success', amount: 150000, currency: 'KES', id: 42 },
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
  const order = await (await post('/api/checkout', { name: 'Fake Payer', phone: '0766444555', quantity: 1 })).json()

  const payload = JSON.stringify({
    event: 'charge.success',
    data: { reference: order.reference, status: 'success', amount: 150000, currency: 'KES' },
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
  const order = await (await post('/api/checkout', { name: 'Paid Once', phone: '0744888999', quantity: 1 })).json()

  mock.charges.get(order.reference).status = 'success'
  await new Promise((r) => setTimeout(r, 3100))
  assert.equal((await (await get(`/api/orders/${order.reference}`)).json()).status, 'paid')

  const payload = JSON.stringify({
    event: 'charge.failed',
    data: { reference: order.reference, status: 'failed', amount: 150000, currency: 'KES' },
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
  const res = await post('/api/checkout', { name: 'Rejected Parent', phone: '0788111000', quantity: 1 })
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
  assert.ok(body.summary.ticketsPaid >= 1)
  assert.equal(body.summary.revenue, body.summary.ticketsPaid * 1500)
})

test('repeated pushes to one phone are rate limited', async () => {
  const phone = '0799000111'
  const codes = []
  for (let i = 0; i < 6; i += 1) {
    const res = await post('/api/checkout', { name: 'Spam Target', phone, quantity: i + 1 })
    codes.push(res.status)
  }
  assert.ok(codes.includes(429), `expected a 429 in ${codes}`)
})
