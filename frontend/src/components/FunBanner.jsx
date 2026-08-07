import Icon from './Icons.jsx'

export default function FunBanner() {
  return (
    <section className="funBanner">
      <div className="shell funBanner__inner">
        <span className="funBanner__badge">Free</span>
        <div className="funBanner__text">
          <p className="funBanner__headline">
            <Icon name="castle" size={30} /> Bouncing castle &amp; face painting
          </p>
          <p className="funBanner__sub">
            <Icon name="food" size={18} /> Food available from vendors — come hungry, leave happy.
          </p>
        </div>
      </div>
    </section>
  )
}
