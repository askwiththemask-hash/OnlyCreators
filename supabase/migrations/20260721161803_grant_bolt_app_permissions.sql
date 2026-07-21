/*
# Grant Full Permissions to bolt_app Role

Grants all necessary permissions to the bolt_app database role
so the Express backend can read and write all tables.
*/

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO bolt_app;

-- Grant all on existing tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO bolt_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO bolt_app;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO bolt_app;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bolt_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bolt_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO bolt_app;
