// Shared helpers for the serverless functions.
// Files that start with "_" are NOT exposed as endpoints by Vercel.
const { neon } = require('@neondatabase/serverless')
const crypto = require('crypto')

// Neon HTTP client (lazy: only connects on first query, so /api/auth still
// works even before DATABASE_URL is configured). Uses the pooled connection string.
let _sql = null
function sql(...args) {
  if (!_sql) _sql = neon(process.env.DATABASE_URL)
  return _sql(...args)
}

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me'
const SESSION_DAYS = 30

function b64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function unb64url(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
}
function hmac(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Signed, stateless session token: base64(payload).hmac
function sign(payload) {
  const data = b64url(JSON.stringify(payload))
  return `${data}.${hmac(data)}`
}
function verify(token) {
  if (!token) return null
  const [data, mac] = token.split('.')
  if (!data || !mac || mac !== hmac(data)) return null
  try {
    const payload = JSON.parse(unb64url(data))
    if (payload.exp && Date.now() > payload.exp) return null
    return payload
  } catch { return null }
}

function parseCookies(req) {
  const header = req.headers.cookie || ''
  const out = {}
  header.split(';').forEach(part => {
    const i = part.indexOf('=')
    if (i < 0) return
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  })
  return out
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', [
    `session=${token}`,
    'HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/',
    `Max-Age=${60 * 60 * 24 * SESSION_DAYS}`
  ].join('; '))
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')
}

function getUser(req) {
  return verify(parseCookies(req).session)
}

// numeric columns come back as strings from pg — turn them into real numbers
function numify(row) {
  if (!row) return row
  for (const k of ['subtotal', 'descuento', 'total', 'cuotas', 'cantidad', 'precio_unitario']) {
    if (row[k] !== undefined && row[k] !== null) row[k] = Number(row[k])
  }
  return row
}

module.exports = {
  sql, sign, verify, setSessionCookie, clearSessionCookie, getUser, numify,
  SESSION_DAYS,
}
