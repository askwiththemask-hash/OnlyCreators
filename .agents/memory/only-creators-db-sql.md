---
name: Only Creators DB raw SQL
description: Raw SQL query pattern for Only Creators backend routes
---

Raw SQL via `db.execute(sql\`...\`)` or `db.execute(sql.raw(...))` returns snake_case column names (e.g. `display_name`, `created_at`).
Drizzle ORM queries return camelCase.
Format helpers must handle both: `r.display_name ?? r.displayName`.

**Why:** Routes use raw SQL for complex JOINs (like creator profiles with counts), but some routes use Drizzle ORM directly which returns camelCase.
