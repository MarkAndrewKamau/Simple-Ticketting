import Icon from './Icons.jsx'
import Crest from './Crest.jsx'
import NairobiVerified from './NairobiVerified.jsx'
import { event, formatKes, isFamilyOfferActive } from '../data/event.js'

const details = [
  { icon: 'calendar', label: 'Date', value: [event.date.weekday, event.date.full] },
  { icon: 'clock', label: 'Time', value: [event.time] },
  { icon: 'pin', label: 'Venue', value: ['Grace Height', 'Heritage Academy'] },
  {
    icon: 'ticket',
    label: 'Tickets',
    value: isFamilyOfferActive()
      ? [`${formatKes(event.ticket.familyKes)} per family`, `ends ${event.ticket.offerEndsLabel}`]
      : [`${formatKes(event.ticket.parentKes)} parent`, `${formatKes(event.ticket.childKes)} child`],
  },
]

export default function Hero() {
  return (
    <section className="hero" id="top">
      <span className="confetti confetti--1" />
      <span className="confetti confetti--2" />
      <span className="confetti confetti--3" />
      <span className="confetti confetti--4" />

      <div className="shell hero__grid">
        <div className="hero__copy">
          <div className="hero__school">
            <Crest size={54} />
            <div>
              <p className="hero__schoolName">Grace Height <span>Heritage Academy</span></p>
              <p className="hero__motto">{event.motto.join(' · ')}</p>
            </div>
          </div>

          <h1 className="hero__title">
            <span className="script">{event.titleLead}</span>
            <span className="hero__titleMain">Family</span>
            <span className="hero__titleMain hero__titleMain--teal">Connection</span>
            <span className="ribbon">{event.titleTail}</span>
          </h1>

          <p className="hero__tagline">
            <span>{event.tagline[0]}</span> <em>{event.tagline[1]}</em>
          </p>

          <p className="hero__intro">{event.intro}</p>

          <div className="hero__actions">
            <a className="btn btn--gold btn--lg" href="#book">
              <Icon name="ticket" size={20} />
              Get your ticket
              <Icon name="arrow" size={18} />
            </a>
            <a
              className="btn btn--ghost btn--lg"
              href={`https://wa.me/${event.phoneIntl}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="whatsapp" size={20} />
              {event.phone}
            </a>
          </div>

          <p className="hero__note">
            <Icon name="check" size={16} /> Pay by M-Pesa in seconds — an STK push lands on your phone.
          </p>
        </div>

        <div className="hero__ticketWrap">
          <div className="stub" aria-hidden="true">
            <div className="stub__top">
              <p className="stub__kicker">
                {isFamilyOfferActive() ? 'Admit one family' : 'Admit one'}
              </p>
              <p className="stub__title">Family Connection Experience</p>
              <p className="stub__script">Know Your Child. Grow Your Child.</p>
            </div>
            <div className="stub__perf">
              <span className="stub__notch stub__notch--l" />
              <span className="stub__dashes" />
              <span className="stub__notch stub__notch--r" />
            </div>
            <div className="stub__bottom">
              <div>
                <p className="stub__label">Date</p>
                <p className="stub__value">{event.date.short} · {event.date.weekday}</p>
              </div>
              <div>
                <p className="stub__label">Time</p>
                <p className="stub__value">11AM – 5PM</p>
              </div>
              <div className="stub__price">
                <p className="stub__label">{isFamilyOfferActive() ? 'Family' : 'From'}</p>
                <p className="stub__value stub__value--big">
                  {formatKes(
                    isFamilyOfferActive() ? event.ticket.familyKes : event.ticket.childKes,
                  )}
                </p>
              </div>
            </div>

            {/* Reads like the small print along the bottom of a real ticket. */}
            <p className="stub__verified">
              <span className="stub__verifiedLabel">Listed on</span>
              <NairobiVerified variant="mono" height={20} />
            </p>
          </div>

          <div className="audienceBadge">
            <Icon name="family" size={22} />
            <p>
              For families with children in <strong>{event.audience}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="shell">
        <ul className="detailBar">
          {details.map((d) => (
            <li key={d.label}>
              <span className={`detailBar__icon detailBar__icon--${d.icon}`}>
                <Icon name={d.icon} size={22} />
              </span>
              <div>
                <p className="detailBar__label">{d.label}</p>
                {d.value.map((v) => (
                  <p className="detailBar__value" key={v}>{v}</p>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
