import { MongoClient } from 'mongodb'
import { config } from './config.js'

const client = new MongoClient(config.mongo.uri, {
  // Fail fast at boot rather than hanging a parent's checkout request.
  serverSelectionTimeoutMS: 10000,
  retryWrites: true,
})

let collection = null

/** Connects and ensures indexes. Called once at startup. */
export async function connect() {
  await client.connect()
  const db = client.db(config.mongo.dbName)
  collection = db.collection('orders')

  await collection.createIndexes([
    { key: { reference: 1 }, name: 'reference_unique', unique: true },
    { key: { phone: 1, createdAt: -1 }, name: 'phone_recent' },
    { key: { status: 1, createdAt: -1 }, name: 'status_recent' },
    { key: { createdAt: -1 }, name: 'created_desc' },
  ])

  return db
}

/** Cheap round-trip, used by the health check Render polls. */
export async function ping() {
  await client.db(config.mongo.dbName).command({ ping: 1 })
}

export async function disconnect() {
  await client.close()
  collection = null
}

function ordersCollection() {
  if (!collection) throw new Error('Database not connected — call connect() first.')
  return collection
}

/** Statuses that must never be overwritten by a late or replayed event. */
const TERMINAL_PAID = 'paid'

export const orders = {
  async create({ reference, name, phone, email, quantity, amountCents, currency }) {
    const now = new Date()
    const doc = {
      reference,
      name,
      phone,
      email,
      quantity,
      amountCents,
      currency,
      status: 'pending',
      message: null,
      paystackId: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
      lastCheckedAt: null,
    }
    await ordersCollection().insertOne(doc)
    return doc
  },

  async find(reference) {
    return ordersCollection().findOne({ reference })
  },

  /** A still-open charge for this phone, used to avoid a duplicate STK push. */
  async findRecentPending(phone, withinMs) {
    return ordersCollection().findOne(
      { phone, status: 'pending', createdAt: { $gt: new Date(Date.now() - withinMs) } },
      { sort: { createdAt: -1 } },
    )
  },

  async countRecentForPhone(phone, withinMs) {
    return ordersCollection().countDocuments({
      phone,
      createdAt: { $gt: new Date(Date.now() - withinMs) },
    })
  },

  /**
   * Moves an order to a new status.
   *
   * The `status: { $ne: 'paid' }` filter makes this atomic: the webhook and a
   * concurrent poll can both race here, and whichever loses cannot walk a paid
   * order back to failed. Mongo settles it, not us.
   */
  async updateStatus(reference, status, { message = null, paystackId = null } = {}) {
    const set = { status, message, updatedAt: new Date() }
    if (paystackId) set.paystackId = paystackId
    if (status === TERMINAL_PAID) set.paidAt = new Date()

    const result = await ordersCollection().findOneAndUpdate(
      { reference, status: { $ne: TERMINAL_PAID } },
      { $set: set },
      { returnDocument: 'after' },
    )

    // No match means it was already paid — return the winning document.
    return result ?? (await this.find(reference))
  },

  async markChecked(reference) {
    await ordersCollection().updateOne({ reference }, { $set: { lastCheckedAt: new Date() } })
  },

  async list({ status, limit = 1000 } = {}) {
    const filter = status ? { status } : {}
    return ordersCollection().find(filter).sort({ createdAt: -1 }).limit(limit).toArray()
  },

  async summary() {
    const [row] = await ordersCollection()
      .aggregate([
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            ticketsPaid: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$quantity', 0] },
            },
            revenueCents: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amountCents', 0] },
            },
          },
        },
      ])
      .toArray()

    return row ?? { orders: 0, ticketsPaid: 0, revenueCents: 0 }
  },
}

export default client
