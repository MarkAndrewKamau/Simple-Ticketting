import { useEffect } from 'react'

/**
 * Scrolls to the element named in location.hash after the first render.
 *
 * The browser resolves a hash on load, which for a React app is before any of
 * our markup exists — so a cold visit to /#book (what the printed QR code opens)
 * silently lands at the top of the page. In-page clicks are unaffected because
 * the target is already mounted by then.
 */
export function useHashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return undefined

    let cancelled = false

    const scroll = () => {
      if (cancelled) return
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ block: 'start' })
    }

    // Two frames: one for React to paint, one for layout to settle.
    const raf = requestAnimationFrame(() => requestAnimationFrame(scroll))

    // Web fonts land after paint and shift everything down, so correct once
    // they are in. Falls back silently on browsers without the API.
    document.fonts?.ready.then(scroll).catch(() => {})

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [])
}
