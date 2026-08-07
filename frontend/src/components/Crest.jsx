// Stylised stand-in for the school crest. Swap for the real artwork by
// dropping logo.svg/png into frontend/public and rendering an <img> instead.
export default function Crest({ size = 64 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-label="Grace Height Heritage Academy crest">
      <circle cx="32" cy="32" r="31" fill="#0d2547" />
      <circle cx="32" cy="32" r="27.5" fill="none" stroke="#c8961e" strokeWidth="1.2" />
      <path
        d="M32 12c6 0 11 1.6 14 3v20c0 8.6-6 14.6-14 17.6C24 49.6 18 43.6 18 35V15c3-1.4 8-3 14-3Z"
        fill="#fbf6ec"
      />
      <path d="M32 21v20M32 21c-2.6-1.6-6-2.2-9-2.2v18c3 0 6.4.6 9 2.2M32 21c2.6-1.6 6-2.2 9-2.2v18c-3 0-6.4.6-9 2.2"
        fill="none" stroke="#0d2547" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M32 14.5c1.6 1.4 2.4 2.8 2.4 4.2 0 1.2-.8 2-2.4 3.2-1.6-1.2-2.4-2-2.4-3.2 0-1.4.8-2.8 2.4-4.2Z" fill="#c8961e" />
      <path d="M8 40h48l-6 6H14Z" fill="#c8961e" />
      <circle cx="32" cy="8" r="2.4" fill="#c8961e" />
    </svg>
  )
}
