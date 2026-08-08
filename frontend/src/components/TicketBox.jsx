import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icons.jsx'
import { event, formatKes, isFamilyOfferActive } from '../data/event.js'
import { normalizeKePhone, formatKePhone } from '../lib/phone.js'
import { initiateCheckout, getOrderStatus } from '../lib/api.js'

const MAX_PARENTS = 10
const MAX_CHILDREN = 20
const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 150000 // ~2.5 min, a little past the STK prompt's own expiry

const emptyForm = { name: '', phone: '', email: '', parents: 1, children: 1 }

export default function TicketBox() {
  const [form, setForm] = useState(emptyForm)
  // Per-person is the starting selection because at the opening headcount
  // (1 parent, 1 child) it costs KSh 1,500 against the family rate's 2,500.
  // Pre-selecting the offer there would quietly charge 1,000 more than needed.
  // Once a family adds people the card shows what they would save by switching.
  const [ticketType, setTicketType] = useState('per_head')
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | pending | success | failed
  const [message, setMessage] = useState('')
  const [order, setOrder] = useState(null)
  const pollRef = useRef(null)

  const offerActive = isFamilyOfferActive()

  const perHeadTotal =
    form.parents * event.ticket.parentKes + form.children * event.ticket.childKes
  const total = ticketType === 'family' ? event.ticket.familyKes : perHeadTotal
  const saving = useMemo(
    () => Math.max(0, perHeadTotal - event.ticket.familyKes),
    [perHeadTotal],
  )

  useEffect(() => () => clearInterval(pollRef.current), [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  /**
   * Counts must be derived from the previous state, not from a value captured
   * at render. Two taps landing in the same React batch both read the same
   * stale number and the second one is lost.
   */
  function step(field, delta, min, max) {
    setForm((f) => ({ ...f, [field]: Math.min(max, Math.max(min, f[field] + delta)) }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const next = {}
    if (form.name.trim().length < 3) next.name = 'Please enter your full name.'
    if (!normalizeKePhone(form.phone)) next.phone = 'Use a Safaricom number like 0712 345 678.'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'That email looks incomplete.'
    if (form.parents < 1) next.parents = 'At least one parent or guardian must attend.'
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
        ticketType,
        parents: form.parents,
        children: form.children,
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

          {offerActive && (
            <div className="offerCallout">
              <span className="offerCallout__badge">3-day offer</span>
              <p>
                <strong>{formatKes(event.ticket.familyKes)} for the whole family</strong> — however
                many of you are coming. Ends {event.ticket.offerEndsLabel}.
              </p>
            </div>
          )}

          <p className="tickets__lede">
            Pay straight from your phone — we send an M-Pesa request, you enter your PIN, and your
            slot is booked.
          </p>

          <ul className="priceList">
            <li>
              <span>Parent / guardian</span>
              <strong>{formatKes(event.ticket.parentKes)}</strong>
            </li>
            <li>
              <span>Child</span>
              <strong>{formatKes(event.ticket.childKes)}</strong>
            </li>
            {offerActive && (
              <li className="priceList__offer">
                <span>Whole family <em>(limited offer)</em></span>
                <strong>{formatKes(event.ticket.familyKes)}</strong>
              </li>
            )}
          </ul>

          <a className="tickets__help" href={`https://wa.me/${event.phoneIntl}`} target="_blank" rel="noreferrer">
            <Icon name="whatsapp" size={20} />
            Stuck? WhatsApp us on {event.phone}
          </a>
        </div>

        <div className="ticketCard" id="book">
          <div className="ticketCard__head">
            <div>
              <p className="ticketCard__kicker">Family Connection Experience</p>
              <p className="ticketCard__price">
                {formatKes(total)}{' '}
                <small>{ticketType === 'family' ? 'whole family' : 'total'}</small>
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
              <PendingPrompt
                phone={form.phone}
                total={total}
                instruction={order?.instruction}
                onCancel={reset}
              />
            ) : (
              <form className="form" onSubmit={handleSubmit} noValidate>
                {status === 'failed' && (
                  <p className="alert alert--error" role="alert">{message}</p>
                )}

                {offerActive && (
                  <div className="choice" role="radiogroup" aria-label="Ticket type">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={ticketType === 'family'}
                      className={`choice__opt ${ticketType === 'family' ? 'is-on' : ''}`}
                      onClick={() => setTicketType('family')}
                    >
                      <span className="choice__top">
                        <strong>Family ticket</strong>
                        <b>{formatKes(event.ticket.familyKes)}</b>
                      </span>
                      <span className="choice__sub">
                        Everyone in your family, however many
                        {saving > 0 && <em> · save {formatKes(saving)}</em>}
                      </span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={ticketType === 'per_head'}
                      className={`choice__opt ${ticketType === 'per_head' ? 'is-on' : ''}`}
                      onClick={() => setTicketType('per_head')}
                    >
                      <span className="choice__top">
                        <strong>Pay per person</strong>
                        <b>{formatKes(perHeadTotal)}</b>
                      </span>
                      <span className="choice__sub">
                        {formatKes(event.ticket.parentKes)} per parent ·{' '}
                        {formatKes(event.ticket.childKes)} per child
                      </span>
                    </button>
                  </div>
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

                <div className="counts">
                  <Counter
                    label="Parents / guardians"
                    value={form.parents}
                    onStep={(d) => step('parents', d, 1, MAX_PARENTS)}
                  />
                  <Counter
                    label="Children"
                    value={form.children}
                    onStep={(d) => step('children', d, 0, MAX_CHILDREN)}
                  />
                </div>
                {errors.parents && <em className="counts__err">{errors.parents}</em>}

                {ticketType === 'family' && (
                  <p className="counts__note">
                    <Icon name="check" size={15} />
                    Headcount is for seating and catering — the family price is the same either way.
                  </p>
                )}

                <div className="total">
                  <span>
                    {ticketType === 'family'
                      ? 'Family ticket'
                      : `${form.parents}×${event.ticket.parentKes.toLocaleString('en-KE')} + ${form.children}×${event.ticket.childKes.toLocaleString('en-KE')}`}
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

function Counter({ label, value, onStep }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="stepper">
        <button type="button" onClick={() => onStep(-1)} aria-label={`Fewer ${label.toLowerCase()}`}>
          −
        </button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onStep(1)} aria-label={`More ${label.toLowerCase()}`}>
          +
        </button>
      </div>
    </div>
  )
}

function PendingPrompt({ phone, total, instruction, onCancel }) {
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
      {instruction && <p className="state__instruction">{instruction}</p>}
      <p className="state__hint">Keep this page open — it updates the moment payment lands.</p>
      <button className="btn btn--ghost btn--block" type="button" onClick={onCancel}>
        Cancel and start over
      </button>
    </div>
  )
}

function Confirmation({ order, onReset }) {
  const people = [
    `${order.parents} ${order.parents === 1 ? 'parent' : 'parents'}`,
    order.children > 0 && `${order.children} ${order.children === 1 ? 'child' : 'children'}`,
  ]
    .filter(Boolean)
    .join(' and ')

  return (
    <div className="state state--success">
      <span className="state__check">
        <Icon name="check" size={30} />
      </span>
      <h3>You're in!</h3>
      <p>
        Confirmed for {people} at the Family Connection Experience.
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
