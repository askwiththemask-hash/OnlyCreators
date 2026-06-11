---
name: Only Creators deletion system
description: How content deletion works — ownership checks, file cleanup, confirmation dialogs
---

## Ownership rules
- `DELETE /api/samples/:id` — owner (via creatorProfile.userId === authUser.id) OR admin. Returns 403 if neither.
- `DELETE /api/comments/:id` — commenter (userId === authUser.id) OR admin.
- `DELETE /api/samples/:id/reviews` — reviewer only (own review).
- `DELETE /api/admin/samples/:id` — admin only, same logic as above but goes through admin route.
- `DELETE /api/admin/reviews/:id` — admin only.

## File cleanup
Both `DELETE /api/samples/:id` and `DELETE /api/admin/samples/:id` clean up GCS files before deleting the DB row.
Pattern: normalize the stored URL with `storageService.normalizeObjectEntityPath(url)`, then call `storageService.deleteObjectEntity(path)` if the path starts with `/objects/`.
Errors are swallowed with `Promise.allSettled` — a missing file never blocks DB deletion.
The `deleteObjectEntity` method was added to `ObjectStorageService` in `objectStorage.ts`.

## Frontend
- Reusable `ConfirmDialog` + `useConfirmDialog` hook at `artifacts/only-creators/src/components/ui/ConfirmDialog.tsx`
- Dashboard (`dashboard/index.tsx`): Delete button per sample row → ConfirmDialog → `DELETE /api/samples/:id` → invalidate query
- Admin samples (`admin/samples.tsx`): Delete button → ConfirmDialog → `DELETE /api/admin/samples/:id` → invalidate query
- Sample detail (`sample-detail.tsx`): Admin-only Delete button in sidebar + inline in title row; comment delete uses ConfirmDialog

**Why:** Silent deletes are dangerous; always gate behind a modal. File cleanup must happen before DB row removal to avoid orphaned GCS objects.
