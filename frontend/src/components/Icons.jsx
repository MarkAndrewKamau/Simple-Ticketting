const paths = {
  chat: (
    <>
      <path d="M20 12.5c0 3.6-3.6 6.5-8 6.5-1 0-2-.15-2.9-.42L4 20.5l1.3-3.3C4.2 16 3.5 14.4 3.5 12.5 3.5 8.9 7.1 6 11.5 6S20 8.9 20 12.5Z" />
      <circle cx="8.5" cy="12.5" r=".9" fill="currentColor" stroke="none" />
      <circle cx="11.8" cy="12.5" r=".9" fill="currentColor" stroke="none" />
      <circle cx="15.1" cy="12.5" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  heart: <path d="M12 20.2s-7.2-4.6-7.2-9.6a4 4 0 0 1 7.2-2.4 4 4 0 0 1 7.2 2.4c0 5-7.2 9.6-7.2 9.6Z" />,
  family: (
    <>
      <circle cx="6.8" cy="7.6" r="2.3" />
      <circle cx="17.2" cy="7.6" r="2.3" />
      <circle cx="12" cy="13.4" r="1.9" />
      <path d="M2.8 17.5a4 4 0 0 1 8 0M13.2 17.5a4 4 0 0 1 8 0M8.6 21a3.4 3.4 0 0 1 6.8 0" />
    </>
  ),
  discover: (
    <>
      <circle cx="10.6" cy="10.6" r="6.6" />
      <path d="M15.4 15.4 21 21" />
      <circle cx="10.6" cy="8.9" r="1.7" />
      <path d="M7.7 14.4a3 3 0 0 1 5.8 0" />
    </>
  ),
  mic: (
    <>
      <path d="M12 3a2.8 2.8 0 0 0-2.8 2.8v5.4a2.8 2.8 0 0 0 5.6 0V5.8A2.8 2.8 0 0 0 12 3Z" />
      <path d="M5.4 11.2a6.6 6.6 0 0 0 13.2 0M12 17.8V21M9 21h6" />
    </>
  ),
  consult: (
    <>
      <circle cx="8.4" cy="9" r="2.6" />
      <path d="M3.6 19.4a4.8 4.8 0 0 1 9.6 0" />
      <path d="M14.6 3.6H21v5.2h-2.1L16.6 11V8.8h-2z" />
    </>
  ),
  bond: (
    <>
      <path d="M12 19.6s-6.6-4.2-6.6-8.8a3.7 3.7 0 0 1 6.6-2.2 3.7 3.7 0 0 1 6.6 2.2c0 4.6-6.6 8.8-6.6 8.8Z" />
      <path d="M9.2 11.6h5.6M12 8.8v5.6" />
    </>
  ),
  castle: (
    <>
      <path d="M4 20.5v-9.7L2.8 7.2l2.6 1.3 1.3-3.3 2.4 2.3L12 3.7l2.9 3.8 2.4-2.3 1.3 3.3 2.6-1.3-1.2 3.6v9.7" />
      <path d="M2.6 20.5h18.8" />
      <path d="M9.8 20.5v-4.1a2.2 2.2 0 0 1 4.4 0v4.1" />
    </>
  ),
  food: (
    <>
      <path d="M2.8 19.4h18.4" />
      <path d="M4.8 16.2a7.2 7.2 0 0 1 14.4 0Z" />
      <path d="M12 6.2V9" />
      <circle cx="12" cy="5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.2" y="5" width="17.6" height="16" rx="2.6" />
      <path d="M3.2 10h17.6M8.2 3v4M15.8 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 6.8V12l3.4 2.2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.4s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 8.4A2.4 2.4 0 0 1 5.4 6h13.2A2.4 2.4 0 0 1 21 8.4v1.4a2.2 2.2 0 0 0 0 4.4v1.4a2.4 2.4 0 0 1-2.4 2.4H5.4A2.4 2.4 0 0 1 3 15.6v-1.4a2.2 2.2 0 0 0 0-4.4Z" />
      <path d="M14.4 6v12" strokeDasharray="2 2.2" />
    </>
  ),
  check: <path d="m4.5 12.6 5 5L19.5 7" />,
  sparkle: <path d="M12 3.2 13.9 9l5.8 1.9-5.8 1.9L12 18.6l-1.9-5.8L4.3 11 10.1 9Z" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  phone: (
    <path d="M6.3 3.6h3.1l1.6 4-2 1.2a11 11 0 0 0 5.2 5.2l1.2-2 4 1.6v3.1a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.3 5.8a2 2 0 0 1 2-2.2Z" />
  ),
}

const filled = {
  whatsapp:
    'M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2.1 22l5.35-1.37a9.83 9.83 0 0 0 4.59 1.14h.01c5.43 0 9.85-4.42 9.85-9.86A9.8 9.8 0 0 0 12.04 2Zm5.74 14.03c-.24.68-1.4 1.3-1.94 1.35-.5.05-.98.24-3.3-.7-2.78-1.12-4.55-3.98-4.69-4.17-.13-.19-1.12-1.5-1.12-2.86s.71-2.02.96-2.3c.25-.27.55-.34.73-.34h.52c.17 0 .4-.06.62.48.24.57.8 1.98.87 2.13.07.14.12.31.02.5-.1.19-.14.31-.28.48l-.42.49c-.14.14-.28.3-.12.58.16.29.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.15.44.12.6-.07.17-.19.7-.82.89-1.1.19-.29.37-.24.62-.14.25.09 1.6.76 1.87.9.28.13.46.2.53.31.07.12.07.67-.17 1.35Z',
}

export default function Icon({ name, size = 24, className = '' }) {
  if (filled[name]) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
        <path d={filled[name]} fill="currentColor" />
      </svg>
    )
  }
  const d = paths[name]
  if (!d) return null
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d}
    </svg>
  )
}
