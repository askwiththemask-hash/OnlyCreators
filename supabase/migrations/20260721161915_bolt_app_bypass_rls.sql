/*
# Grant bolt_app Role RLS Bypass and Table Access

The Express backend connects as bolt_app. We need it to bypass RLS
so it can perform direct DB operations (auth is handled at the app level).
*/

-- Allow bolt_app to bypass row level security
ALTER ROLE bolt_app BYPASSRLS;
