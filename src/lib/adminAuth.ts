import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.ADMIN_PASSWORD as string
if (!SECRET) throw new Error('ADMIN_PASSWORD environment variable is not set')
const COOKIE_NAME = 'admin_session'
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function createToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + EXPIRY_MS })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token: string): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  try {
    const expected = sign(payload)
    const sigBuf = Buffer.from(sig, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    if (!timingSafeEqual(sigBuf, expBuf)) return false
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return Date.now() < exp
  } catch {
    return false
  }
}

export { COOKIE_NAME }
