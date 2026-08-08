import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Itinerary from './components/Itinerary.jsx'
import FunBanner from './components/FunBanner.jsx'
import Partner from './components/Partner.jsx'
import TicketBox from './components/TicketBox.jsx'
import Footer from './components/Footer.jsx'
import { useHashScroll } from './lib/useHashScroll.js'

export default function App() {
  useHashScroll()

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Itinerary />
        <FunBanner />
        <Partner />
        <TicketBox />
      </main>
      <Footer />
    </>
  )
}
