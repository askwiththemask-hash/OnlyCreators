---
name: Only Creators auth
description: Custom HMAC token auth for the Only Creators platform
---

Token is HMAC-SHA256 signed, stored in `localStorage` key `auth_token`.
`lib/api-client-react/src/custom-fetch.ts` already auto-reads it and attaches `Authorization: Bearer <token>` on every request.
`signToken(userId)` / `verifyToken(token)` live in `artifacts/api-server/src/middlewares/auth.ts`.
Middleware: `requireAuth`, `requireCreator`, `requireAdmin`, `optionalAuth`.

**Why:** Session cookies don't work cleanly in the Replit iframe proxy, so localStorage token was chosen.
