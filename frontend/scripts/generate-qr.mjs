/**
 * Generates the "scan to book" QR code.
 *
 *   npm run qr                          # uses SITE_URL from .env or the default
 *   npm run qr -- https://example.com   # or pass the URL directly
 *
 * Outputs into public/ so the files ship with the site and can also be pulled
 * straight into a flyer:
 *   qr-book.png  — 1200px, for print and WhatsApp
 *   qr-book.svg  — vector, scales to any poster size
 */
import QRCode from 'qrcode'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = join(here, '..', 'public')

const DEFAULT_URL = 'https://ticket-frontend-jf7w.onrender.com/#book'
const url = process.argv[2] || process.env.SITE_URL || DEFAULT_URL

// Brand navy on white. Never invert this: many scanners fail on a light-on-dark
// QR, and printing it on a coloured background is the usual way these break.
const options = {
  errorCorrectionLevel: 'H', // survives a logo overlay, a fold, or a smudge
  margin: 2, // the quiet zone — scanners need it, do not crop it off
  color: { dark: '#0d2547ff', light: '#ffffffff' },
}

const png = await QRCode.toBuffer(url, { ...options, type: 'png', width: 1200 })
await writeFile(join(publicDir, 'qr-book.png'), png)

const svg = await QRCode.toString(url, { ...options, type: 'svg' })
await writeFile(join(publicDir, 'qr-book.svg'), svg)

console.log(`\n  QR code generated for:\n  ${url}\n`)
console.log('  → frontend/public/qr-book.png  (1200px)')
console.log('  → frontend/public/qr-book.svg  (vector)\n')
console.log('  Scan it with a phone before printing anything.\n')
