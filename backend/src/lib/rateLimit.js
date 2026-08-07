/**
 * Minimal in-memory sliding-window limiter.
 *
 * This exists for a specific abuse case: /api/checkout makes a stranger's phone
 * ring with an M-Pesa prompt. Without a cap, anyone could use the endpoint to
 * harass a number. Single-process only — behind multiple instances you would
 * want Redis, but one box is plenty for a school event.
 */
export function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map()

  function prune(now) {
    for (const [key, timestamps] of hits) {
      const live = timestamps.filter((t) => now - t < windowMs)
      if (live.length) hits.set(key, live)
      else hits.delete(key)
    }
  }

  let lastPrune = Date.now()

  return function check(key) {
    const now = Date.now()
    if (now - lastPrune > windowMs) {
      prune(now)
      lastPrune = now
    }

    const timestamps = (hits.get(key) || []).filter((t) => now - t < windowMs)

    if (timestamps.length >= max) {
      const retryAfterSec = Math.ceil((windowMs - (now - timestamps[0])) / 1000)
      return { allowed: false, retryAfterSec, message }
    }

    timestamps.push(now)
    hits.set(key, timestamps)
    return { allowed: true }
  }
}
