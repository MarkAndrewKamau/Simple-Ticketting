import Icon from './Icons.jsx'
import NairobiVerified from './NairobiVerified.jsx'
import { event } from '../data/event.js'

const { partner } = event

export default function Partner() {
  return (
    <section className="partner" id="partner">
      <div className="shell partner__inner">
        <div className="partner__sealWrap" aria-hidden="true">
          <div className="partner__seal">
            <span className="partner__sealRing" />
            <NairobiVerified variant="mono" height={30} className="partner__sealMark" />
            <p className="partner__sealText">{partner.stamp}</p>
            <p className="partner__sealDate">{event.date.short} · Nairobi</p>
          </div>
        </div>

        <div className="partner__copy">
          <p className="partner__kicker">{partner.kicker}</p>

          <a
            className="partner__logoLink"
            href={partner.url}
            target="_blank"
            rel="noreferrer"
          >
            <NairobiVerified height={null} className="partner__bigLogo" />
          </a>

          <p className="partner__lead">{partner.lead}</p>

          <ul className="partner__points">
            {partner.points.map((p) => (
              <li key={p.text}>
                <span className="partner__pointIcon">
                  <Icon name={p.icon} size={17} />
                </span>
                {p.text}
              </li>
            ))}
          </ul>

          <a
            className="btn btn--nv"
            href={partner.url}
            target="_blank"
            rel="noreferrer"
          >
            {partner.cta}
            <Icon name="arrow" size={18} />
          </a>
        </div>
      </div>
    </section>
  )
}
