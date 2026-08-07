import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Itinerary from './components/Itinerary.jsx'
import FunBanner from './components/FunBanner.jsx'
import TicketBox from './components/TicketBox.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Itinerary />
        <FunBanner />
        <TicketBox />
      </main>
      <Footer />
    </>
  )
}
