import { randomInt } from 'node:crypto'
import { orders } from '../db.js'

// No 0/O/1/I/L — parents read these out over the phone.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const PREFIX = 'FCE'

function code(length) {
  let out = ''
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

/** Short, human-readable, collision-checked order reference: FCE-7K3M9Q */
export async function generateReference() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const reference = `${PREFIX}-${code(6)}`
    // A unique index on `reference` is the real guarantee; this just keeps
    // insert conflicts from ever reaching a parent.
    if (!(await orders.find(reference))) return reference
  }
  // Astronomically unlikely; widen rather than fail the booking.
  return `${PREFIX}-${code(10)}`
}
