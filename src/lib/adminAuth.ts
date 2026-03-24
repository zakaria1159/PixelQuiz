// Uses Web Crypto API (crypto.subtle) — works in Edge runtime (middleware) and Node.js
const SECRET = process.env.ADMIN_PASSWORD as string
if (!SECRET) throw new Error('ADMIN_PASSWORD environment variable is not set')

const COOKIE_NAME = 'admin_session'
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function sign(payload: string): Promise<string> {
  const key = await getKey()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function toBase64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64url(str: string): string {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'))
}

export async function createToken(): Promise<string> {
  const payload = toBase64url(JSON.stringify({ exp: Date.now() + EXPIRY_MS }))
  const sig = await sign(payload)
  return `${payload}.${sig}`
}

export async function verifyToken(token: string): Promise<boolean> {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  try {
    const expected = await sign(payload)
    // Constant-time comparison
    if (sig.length !== expected.length) return false
    let mismatch = 0
    for (let i = 0; i < sig.length; i++) {
      mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    if (mismatch !== 0) return false
    const { exp } = JSON.parse(fromBase64url(payload))
    return Date.now() < exp
  } catch {
    return false
  }
}

export { COOKIE_NAME }
