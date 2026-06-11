---
name: Only Creators creator pins
description: How creator PINs work — validation, seeding, admin view
---

## DB schema
`creator_pins` table: `pin TEXT PK`, `used BOOLEAN`, `used_by_user_id INTEGER` (nullable, added via migration), `created_at TIMESTAMP`.

## The 20 official PINs
483921, 715604, 928137, 364850, 571298, 842615, 196743, 653829, 274516, 809341, 531768, 147295, 682430, 395871, 760214, 218956, 874320, 509682, 136847, 947531

All seeded as `used=false`. Any old/invalid PINs (123456, etc.) were deleted except ones already marked `used=true`.

## Registration flow
1. `POST /api/auth/register` with `{ accountType: "creator", creatorPin: "XXXXXX" }`
2. Validates: exactly 6 digits, exists in DB, not already used
3. On success: creates user, then sets `used=true, used_by_user_id=<new user id>`

## Admin view
`GET /api/admin/pins` (requireAdmin) — returns all PINs with `{ pin, used, usedByUserId, usedByUsername, usedByEmail }`.
Frontend page: `/admin/pins` → `artifacts/only-creators/src/pages/admin/pins.tsx`
Linked from the admin panel home card.

**Why:** Each PIN is one-time use. `used_by_user_id` lets admin see exactly which creator account consumed each PIN without exposing the PIN list publicly.
