import { event } from '../data/event.js'

export default function Itinerary() {
  return (
    <section className="section itinerary" id="itinerary">
      <div className="shell">
        <p className="eyebrow eyebrow--light">11:00 AM – 5:00 PM</p>
        <h2 className="h2 h2--light">
          The <span className="script script--gold">whole</span> day, hour by hour
        </h2>

        <ol className="timeline">
          {event.itinerary.map((slot, i) => (
            <li className="timeline__item" key={slot.time} style={{ '--i': i }}>
              <span className="timeline__time">{slot.time}</span>
              <span className="timeline__dot" />
              <span className="timeline__label">{slot.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
