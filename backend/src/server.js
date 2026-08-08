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

  // Auth failures and reachability failures have completely different fixes,
  // and pointing at the wrong one costs a deploy cycle to discover.
  if (/bad auth|Authentication failed|AuthenticationFailed/i.test(err.message)) {
    console.error('  Atlas was reached but rejected the credentials. Check, in order:')
    console.error('   1. The password placeholder was replaced (no <db_password> in the URI).')
    console.error('   2. Special characters in the password are URL-encoded (@ : / ? # % &).')
    console.error('   3. The username matches Atlas → Database Access exactly.')
    console.error('   4. No stray quotes, spaces or newlines around the value.')
    console.error('   5. No authSource override — Atlas users live in "admin".\n')
  } else {
    console.error('  Atlas could not be reached. Check that this host is allowed in')
    console.error('  Atlas → Network Access, and that the cluster is not paused.\n')
  }

  process.exit(1)
}

const app = createApp()

const server = app.listen(config.port, () => {
  const mode = config.paystack.isLive ? 'LIVE' : 'test'
  console.log(`\n  Family Connection ticketing API`)
  console.log(`  → http://localhost:${config.port}`)
  const t = config.ticket
  console.log(`  → Paystack ${mode} keys`)
  console.log(
    `  → parent KSh ${t.parentCents / 100} · child KSh ${t.childCents / 100} · ` +
      `family KSh ${t.familyCents / 100} (offer ends ${t.offerEndsAt.toISOString()})`,
  )
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
