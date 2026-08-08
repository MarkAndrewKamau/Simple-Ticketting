/**
 * The school crest. Source artwork is the supplied PDF, converted to a
 * background-knocked-out PNG so it sits cleanly on both the cream and the
 * navy sections. Replace frontend/public/logo.png to update it everywhere.
 */
export default function Crest({ size = 64, className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="Graceheights Heritage Academy crest"
      // The seal is slightly taller than it is wide — pin the height and let
      // the width follow so it never squashes.
      style={{ height: size, width: 'auto' }}
      className={`crest ${className}`}
      loading="eager"
      decoding="async"
    />
  )
}
