---
name: Only Creators object storage
description: GCS presigned URL upload setup for the Only Creators platform
---

Object storage is provisioned via Replit App Storage (GCS-backed).
Upload flow: client POSTs metadata to `/api/storage/uploads/request-url` → gets presigned PUT URL → PUTs file bytes directly to GCS → objectPath stored in DB.
Serving URL: `/api/storage${objectPath}` (e.g. `/api/storage/objects/uploads/uuid`).

The `useUpload` hook from `@workspace/object-storage-web` uses plain `fetch` — it does NOT auto-attach the auth token from localStorage.
Upload page manually adds `Authorization: Bearer <token>` when calling the request-url endpoint.
The `/storage/uploads/request-url` route is guarded with `requireAuth`.

**Why:** The custom-fetch lib only runs inside React Query hooks; presigned URL requests are not React Query calls, so the token must be added manually.
