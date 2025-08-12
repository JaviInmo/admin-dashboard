// src/lib/jwt.ts
// Minimal JWT decode utility (no verification). Use only for reading claims on the client.

export type JwtClaims = Record<string, any>

export function decodeJWT(token: string): JwtClaims | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.length % 4 ? base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=') : base64
    const decoded = atob(padded)
    return JSON.parse(decoded)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error decoding JWT:', err)
    return null
  }
}
