import { googleLogin } from "./auth.service.js"

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,   // 7 days
}

 
// ─────────────────────────────────────────────────────────────
// POST /auth/google
// Frontend sends idToken from Google → we verify → return tokens
// ─────────────────────────────────────────────────────────────
 
export async function googleAuth(req, res) {
    try {
        
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}