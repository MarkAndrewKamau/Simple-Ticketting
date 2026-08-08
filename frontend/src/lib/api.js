const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  let body = null
  try {
    body = await res.json()
  } catch {
    // non-JSON response (proxy error page, etc.)
  }

  if (!res.ok) {
    throw new Error(body?.message || `Request failed (${res.status})`)
  }
  return body
}

/**
 * Starts a Paystack mobile-money charge. The backend prices the booking from
 * the ticket type and headcount, so we never send money values from the client
 * — and it re-checks the family offer deadline against its own clock.
 */
export function initiateCheckout({ name, email, phone, ticketType, parents, children }) {
  return request('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ name, email, phone, ticketType, parents, children }),
  })
}

/** Polls an order until it is paid, failed, or abandoned. */
export function getOrderStatus(reference) {
  return request(`/api/orders/${encodeURIComponent(reference)}`)
}
