import { useEffect, useRef, useState } from 'react'
import Icon from './Icons.jsx'
import { event, formatKes } from '../data/event.js'
import { normalizeKePhone, formatKePhone } from '../lib/phone.js'
import { initiateCheckout, getOrderStatus } from '../lib/api.js'

const MAX_TICKETS = 10
const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 150000 // ~2.5 min, a little past the STK prompt's own expiry

const emptyForm = { name: '', phone: '', email: '', quantity: 1 }

export default function TicketBox() {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | pending | success | failed
  const [message, setMessage] = useState('')
  const [order, setOrder] = useState(null)
  const pollRef = useRef(null)

  const total = form.quantity * event.ticket.priceKes

  useEffect(() => () => clearInterval(pollRef.current), [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const next = {}
    if (form.name.trim().length < 3) next.name = 'Please enter your full name.'
    if (!normalizeKePhone(form.phone)) next.phone = 'Use a Safaricom number like 0712 345 678.'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'That email looks incomplete.'
    if (form.quantity < 1 || form.quantity > MAX_TICKETS) next.quantity = `Between 1 and ${MAX_TICKETS} tickets.`
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function startPolling(reference) {
    const startedAt = Date.now()
    clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const result = await getOrderStatus(reference)
        if (result.status === 'paid') {
          clearInterval(pollRef.current)
          setOrder(result)
          setStatus('success')
        } else if (result.status === 'failed' || result.status === 'abandoned') {
          clearInterval(pollRef.current)
          setStatus('failed')
          setMessage(result.message || 'The payment was not completed. You can try again.')
        } else if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          clearInterval(pollRef.current)
          setStatus('failed')
          setMessage(
            `We did not get a confirmation in time. If your M-Pesa shows the payment went through, WhatsApp ${event.phone} with reference ${reference}.`,
          )
        }
      } catch {
        // A single failed poll is not fatal — keep trying until the timeout.
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          clearInterval(pollRef.current)
          setStatus('failed')
          setMessage('We lost connection while confirming your payment. Please check M-Pesa before retrying.')
        }
      }
    }, POLL_INTERVAL_MS)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setStatus('sending')
    setMessage('')

    try {
      const result = await initiateCheckout({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: normalizeKePhone(form.phone),
        quantity: form.quantity,
      })
      setOrder(result)
      setStatus('pending')
      startPolling(result.reference)
    } catch (err) {
      setStatus('failed')
      setMessage(err.message || 'We could not reach the payment service. Please try again.')
    }
  }

  function reset() {
    clearInterval(pollRef.current)
    setStatus('idle')
    setMessage('')
    setOrder(null)
  }

  return (
    <section className="section tickets" id="tickets">
      <div className="shell tickets__grid">
        <div className="tickets__pitch">
          <p className="eyebrow">Limited slots</p>
          <h2 className="h2">
            Register <span className="script script--gold">today</span>
          </h2>
          <p className="tickets__lede">
            {formatKes(event.ticket.priceKes)} {event.ticket.unit}. Pay straight from your phone — we
            send an M-Pesa request, you enter your PIN, and your slot is booked.
          </p>

          <ol className="steps">
            <li><span>1</span> Fill in your details and how many children are coming.</li>
            <li><span>2</span> Approve the M-Pesa prompt on your phone with your PIN.</li>
            <li><span>3</span> Get your confirmation code — show it at registration.</li>
          </ol>

          <a className="tickets__help" href={`https://wa.me/${event.phoneIntl}`} target="_blank" rel="noreferrer">
            <Icon name="whatsapp" size={20} />
            Stuck? WhatsApp us on {event.phone}
          </a>
        </div>

        <div className="ticketCard">
          <div className="ticketCard__head">
            <div>
              <p className="ticketCard__kicker">Family Connection Experience</p>
              <p className="ticketCard__price">
                {formatKes(event.ticket.priceKes)} <small>{event.ticket.unit}</small>
              </p>
            </div>
            <Icon name="ticket" size={30} />
          </div>

          <div className="ticketCard__perf">
            <span className="ticketCard__notch ticketCard__notch--l" />
            <span className="ticketCard__dashes" />
            <span className="ticketCard__notch ticketCard__notch--r" />
          </div>

          <div className="ticketCard__body">
            {status === 'success' && order ? (
              <Confirmation order={order} onReset={() => { reset(); setForm(emptyForm) }} />
            ) : status === 'pending' ? (
              <PendingPrompt phone={form.phone} total={total} onCancel={reset} />
            ) : (
              <form className="form" onSubmit={handleSubmit} noValidate>
                {status === 'failed' && (
                  <p className="alert alert--error" role="alert">{message}</p>
                )}

                <label className="field">
                  <span>Parent / guardian name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Jane Wanjiru"
                    autoComplete="name"
                  />
                  {errors.name && <em>{errors.name}</em>}
                </label>

                <label className="field">
                  <span>M-Pesa phone number</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="0712 345 678"
                    autoComplete="tel"
                  />
                  {errors.phone && <em>{errors.phone}</em>}
                </label>

                <label className="field">
                  <span>Email <small>(optional — for your receipt)</small></span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  {errors.email && <em>{errors.email}</em>}
                </label>

                <div className="field">
                  <span>How many children?</span>
                  <div className="stepper">
                    <button
                      type="button"
                      onClick={() => update('quantity', Math.max(1, form.quantity - 1))}
                      aria-label="Fewer tickets"
                    >
                      −
                    </button>
                    <strong>{form.quantity}</strong>
                    <button
                      type="button"
                      onClick={() => update('quantity', Math.min(MAX_TICKETS, form.quantity + 1))}
                      aria-label="More tickets"
                    >
                      +
                    </button>
                  </div>
                  {errors.quantity && <em>{errors.quantity}</em>}
                </div>

                <div className="total">
                  <span>
                    {form.quantity} × {formatKes(event.ticket.priceKes)}
                  </span>
                  <strong>{formatKes(total)}</strong>
                </div>

                <button className="btn btn--navy btn--block" type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? (
                    <>
                      <span className="spinner" /> Sending request…
                    </>
                  ) : (
                    <>
                      <Icon name="phone" size={18} />
                      Pay {formatKes(total)} with M-Pesa
                    </>
                  )}
                </button>

                <p className="ticketCard__fine">
                  Secured by Paystack. You will get an M-Pesa prompt on the number above.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function PendingPrompt({ phone, total, onCancel }) {
  return (
    <div className="state">
      <span className="state__pulse">
        <Icon name="phone" size={30} />
      </span>
      <h3>Check your phone</h3>
      <p>
        We sent a request for <strong>{formatKes(total)}</strong> to{' '}
        <strong>{formatKePhone(phone)}</strong>. Enter your M-Pesa PIN to confirm.
      </p>
      <p className="state__hint">Keep this page open — it updates the moment payment lands.</p>
      <button className="btn btn--ghost btn--block" type="button" onClick={onCancel}>
        Cancel and start over
      </button>
    </div>
  )
}

function Confirmation({ order, onReset }) {
  return (
    <div className="state state--success">
      <span className="state__check">
        <Icon name="check" size={30} />
      </span>
      <h3>You're in!</h3>
      <p>
        {order.quantity} {order.quantity === 1 ? 'ticket' : 'tickets'} confirmed for the Family
        Connection Experience.
      </p>
      <p className="state__ref">
        Reference
        <strong>{order.reference}</strong>
      </p>
      <p className="state__hint">
        Screenshot this or show your M-Pesa message at registration from 11:00 AM.
      </p>
      <button className="btn btn--ghost btn--block" type="button" onClick={onReset}>
        Book for another family
      </button>
    </div>
  )
}
