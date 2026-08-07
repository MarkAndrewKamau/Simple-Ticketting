import { createApp } from './app.js'
import { config } from './config.js'
import { connect, disconnect } from './db.js'

// Connect before listening: a server that accepts checkouts it cannot record
// would take a parent's money and lose the booking.
try {
  await connect()
  console.log(`  MongoDB connected · database "${config.mongo.dbName}"`)
} catch (err) {
  console.error('\n  Could not connect to MongoDB.')
  console.error(`  ${err.message}\n`)
  console.error('  Check MONGODB_URI, and that this host is allowed in Atlas → Network Access.\n')
  process.exit(1)
}

const app = createApp()

const server = app.listen(config.port, () => {
  const mode = config.paystack.isLive ? 'LIVE' : 'test'
  console.log(`\n  Family Connection ticketing API`)
  console.log(`  → http://localhost:${config.port}`)
  console.log(`  → Paystack ${mode} keys · KSh ${config.ticket.priceKes} per ticket`)
  console.log(`  → allowed origins: ${config.allowedOrigins.join(', ')}`)
  if (config.paystack.isLive) {
    console.log('  ⚠  Live keys in use — real money will move.\n')
  } else {
    console.log('')
  }
})

let shuttingDown = false

async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n  ${signal} received, shutting down…`)

  // Do not hang forever on a stuck connection.
  const force = setTimeout(() => process.exit(1), 8000)
  force.unref()

  server.close(async () => {
    await disconnect().catch(() => {})
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
