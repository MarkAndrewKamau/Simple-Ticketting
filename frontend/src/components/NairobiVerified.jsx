/**
 * The Nairobi Verified partner lockup.
 *
 * Built in markup rather than shipped as a raster: it stays crisp at every
 * size, picks up Poppins like the rest of the page, and the `mono` variant can
 * recolour itself for the navy footer and the ticket stub. If the partner sends
 * their official artwork, drop it in public/ and swap this for an <img>.
 *
 * `height` is the pill height in px and everything else scales off it. Pass
 * `height={null}` to leave --nv-h to the stylesheet instead — an inline custom
 * property outranks any media query, so responsive sizes have to come from CSS.
 */
export default function NairobiVerified({ variant = 'pill', height = 34, className = '' }) {
  return (
    <span
      className={`nvLogo nvLogo--${variant} ${className}`}
      style={height == null ? undefined : { '--nv-h': `${height}px` }}
      role="img"
      aria-label="Nairobi Verified"
    >
      <svg className="nvLogo__glass" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          cx="10.2"
          cy="10.2"
          r="6.4"
          stroke="currentColor"
          strokeWidth="2.6"
        />
        <path
          d="M15.1 15.1 20.4 20.4"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>

      <span className="nvLogo__word">
        <span className="nvLogo__name">Nairobi</span>
        <span className="nvLogo__sub">Verified</span>
      </span>
    </span>
  )
}
