// Google Sign-In verification + session management.
//   GET  /api/auth?action=config  -> { clientId }   (public, so the frontend can init GIS)
//   GET  /api/auth?action=me      -> { email, name, picture } | 401
//   POST /api/auth?action=google  { credential } -> sets session cookie
//   POST /api/auth?action=logout  -> clears session cookie
const { OAuth2Client } = require('google-auth-library')
const { sign, setSessionCookie, clearSessionCookie, getUser, SESSION_DAYS } = require('./_lib')

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const ALLOWED = (process.env.ALLOWED_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

module.exports = async (req, res) => {
  const action = (req.query && req.query.action) || (req.body && req.body.action)

  if (req.method === 'GET' && action === 'config') {
    return res.status(200).json({ clientId: CLIENT_ID || null })
  }

  if (req.method === 'GET' && action === 'me') {
    const user = getUser(req)
    if (!user) return res.status(401).json({ error: 'no auth' })
    return res.status(200).json({ email: user.email, name: user.name, picture: user.picture })
  }

  if (req.method === 'POST' && action === 'logout') {
    clearSessionCookie(res)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'POST' && action === 'google') {
    const { credential } = req.body || {}
    if (!credential) return res.status(400).json({ error: 'missing credential' })
    if (!CLIENT_ID) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not set' })
    try {
      const client = new OAuth2Client(CLIENT_ID)
      const ticket = await client.verifyIdToken({ idToken: credential, audience: CLIENT_ID })
      const p = ticket.getPayload()
      const email = (p.email || '').toLowerCase()

      // Only the owner(s) listed in ALLOWED_EMAILS may sign in.
      if (ALLOWED.length && !ALLOWED.includes(email)) {
        return res.status(403).json({ error: 'email not authorized' })
      }

      const token = sign({
        email, name: p.name, picture: p.picture,
        exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
      })
      setSessionCookie(res, token)
      return res.status(200).json({ ok: true, email, name: p.name, picture: p.picture })
    } catch (e) {
      console.error('google verify failed:', e.message)
      return res.status(401).json({ error: 'invalid token' })
    }
  }

  return res.status(400).json({ error: 'bad request' })
}
