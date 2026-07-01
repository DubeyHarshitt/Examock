# Examock — Login Flow

## Overview

```
User → Google Popup → idToken → Backend → JWT → Dashboard
```

No redirects. No callback URLs. One POST request.

---

## Step 1 — User clicks "Login with Google"

```
React frontend
@react-oauth/google library
        ↓
Google popup opens
User selects account
        ↓
Google gives React an idToken
```

The idToken is a signed JWT from Google containing:

| Field | Value |
|---|---|
| `sub` | Google's unique ID for this user |
| `email` | user@gmail.com |
| `name` | Full name |
| `picture` | Avatar URL |
| `email_verified` | true/false |

Your backend never talks to Google directly at this point.

---

## Step 2 — Frontend sends idToken to backend

```js
const { credential } = googleResponse   // idToken from Google

await axios.post('/auth/google', { idToken: credential })
```

---

## Step 3 — Backend verifies idToken

```
POST /auth/google
        ↓
validate()              Zod checks idToken field exists
        ↓
googleAuth()            controller — reads req.body.idToken
        ↓
googleLogin()           service
        ↓
verifyGoogleToken()     google.service.js
  → client.verifyIdToken()
  → is this token genuine?
  → is it for YOUR app? (client_id match)
  → is it not expired?
  → returns { sub, email, name, picture }
```

> If the token is fake, tampered, or expired — throws 400. Nothing else runs.

---

## Step 4 — Find or create user in DB

```
payload.sub = Google's unique ID for this user

prisma.user.upsert({
  where: { gmailId: payload.sub }
})

First login?  → creates new row in users table
Returning?    → updates name + avatar only
              → examTypeId, mobile untouched
```

---

## Step 5 — Issue tokens

```
issueTokenPair({ userId, email, role })
        ↓
accessToken   → JWT, expires in 15 min
refreshToken  → JWT, expires in 7 days
```

---

## Step 6 — Send tokens back to frontend

```
refreshToken  → httpOnly cookie
              → browser stores it automatically
              → JS cannot read it (XSS safe)

accessToken   → response body
user info     → response body
onboarding    → { needsExamSelection, needsMobileVerification }
```

### Response shape

```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "John Doe",
    "avatarUrl": "https://...",
    "role": "STUDENT",
    "examTypeId": null
  },
  "onboarding": {
    "needsExamSelection": true,
    "needsMobileVerification": true
  }
}
```

---

## Step 7 — Frontend decides where to go

```
receives accessToken
        ↓
localStorage.setItem('accessToken', ...)
        ↓
check onboarding flags
        ↓
needsExamSelection = true       → /onboarding/exam
needsMobileVerification = true  → /onboarding/mobile
both false                      → /dashboard
```

---

## Full picture

```
[Click Login]
      ↓
[Google Popup]
      ↓
[idToken] ──── POST /auth/google ────→ [verifyGoogleToken()]
                                               ↓
                                        [prisma.user.upsert()]
                                               ↓
                                        [issueTokenPair()]
                                               ↓
◄─── accessToken (body) ───────────────────────
◄─── refreshToken (httpOnly cookie) ───────────
      ↓
[localStorage.setItem('accessToken')]
      ↓
[/dashboard or /onboarding]
```

---

## Token storage

| Token | Storage | Expiry | Readable by JS |
|---|---|---|---|
| `accessToken` | localStorage | 15 min | Yes |
| `refreshToken` | httpOnly cookie | 7 days | No |

---

## Security

| Threat | Protection |
|---|---|
| Fake idToken | `client.verifyIdToken()` rejects it |
| Stolen accessToken | Expires in 15 min |
| XSS attack | refreshToken in httpOnly cookie — JS cannot read it |
| CSRF attack | `sameSite: lax` on cookie blocks cross-site requests |

---

## Files involved

```
src/modules/auth/
  ├── auth.routes.js       POST /auth/google → validate → googleAuth
  ├── auth.controller.js   googleAuth() → calls googleLogin()
  ├── auth.service.js      googleLogin() → verify → upsert → tokens
  └── google.service.js    verifyGoogleToken() → client.verifyIdToken()
```

<!-- Flow -->
POST /auth/google
        ↓
validate(schemas.googleAuth)     ← zod checks idToken exists
        ↓
googleAuth (controller)
        ↓
googleLogin(idToken) (service)
        ↓
verifyGoogleToken(idToken) (google.service.js)
  → client.verifyIdToken()
  → Google checks: is this token valid? not expired? for your app?
  → returns payload { sub, email, name, picture }
        ↓
prisma.user.upsert
  → first login  → creates user in DB
  → returning    → updates name + avatar only
        ↓
issueTokenPair({ userId, email, role })
  → accessToken   (JWT, 15 min)
  → refreshToken  (JWT, 7 days)
        ↓
refreshToken → httpOnly cookie (JS can never read this)
        ↓
res.json({
  accessToken,
  user: { id, email, name, avatarUrl, role },
  onboarding: {
    needsExamSelection: true/false,
    needsMobileVerification: true/false
  }
})