import { useEffect, useState } from 'react'
import Crest from './Crest.jsx'
import Icon from './Icons.jsx'
import { event, formatKes } from '../data/event.js'

export default function Nav() {
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav ${stuck ? 'nav--stuck' : ''}`}>
      <div className="nav__inner">
        <a className="nav__brand" href="#top">
          <Crest size={40} />
          <span>
            <strong>Grace Height</strong>
            <small>Heritage Academy</small>
          </span>
        </a>

        <nav className="nav__links">
          <a href="#about">The day</a>
          <a href="#itinerary">Itinerary</a>
          <a href="#tickets">Tickets</a>
        </nav>

        <a className="btn btn--gold nav__cta" href="#book">
          <Icon name="ticket" size={18} />
          Book · {formatKes(event.ticket.priceKes)}
        </a>
      </div>
    </header>
  )
}
