import Icon from './Icons.jsx'
import { event } from '../data/event.js'

export default function About() {
  return (
    <section className="section about" id="about">
      <div className="shell about__grid">
        <div>
          <p className="eyebrow">Why this day matters</p>
          <h2 className="h2">
            One day that changes how you <span className="script script--gold">see</span> your child
          </h2>

          <ul className="pillars">
            {event.pillars.map((p) => (
              <li key={p.title} className={`pillar pillar--${p.color}`}>
                <span className="pillar__icon">
                  <Icon name={p.icon} size={24} />
                </span>
                <p>
                  <strong>{p.title}</strong> {p.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="enjoy">
          <h3 className="enjoy__title">What families will enjoy</h3>
          <ul>
            {event.enjoy.map((item) => (
              <li key={item.text}>
                <span className="enjoy__icon">
                  <Icon name={item.icon} size={20} />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="shell">
        <ul className="together">
          {event.together.map((t) => (
            <li key={t.label} className={`together__card together__card--${t.color}`}>
              <span className="together__glyph">
                <Icon name="sparkle" size={20} />
              </span>
              <span>{t.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
