import Icon from './Icons.jsx'
import Crest from './Crest.jsx'
import NairobiVerified from './NairobiVerified.jsx'
import { event } from '../data/event.js'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer__inner">
        <div className="footer__brand">
          <Crest size={52} />
          <div>
            <p className="footer__name">Grace Height Heritage Academy</p>
            <p className="footer__motto">{event.motto.join(' · ')}</p>
          </div>
        </div>

        <div className="footer__contact">
          <p className="footer__label">Call / WhatsApp</p>
          <a href={`https://wa.me/${event.phoneIntl}`} target="_blank" rel="noreferrer">
            <Icon name="whatsapp" size={22} />
            {event.phone}
          </a>
        </div>
      </div>

      <div className="shell footer__partner">
        <p className="footer__label">{event.partner.kicker}</p>
        <a href={event.partner.url} target="_blank" rel="noreferrer">
          <NairobiVerified height={34} />
        </a>
      </div>

      <ul className="valuesStrip">
        {event.values.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
    </footer>
  )
}
