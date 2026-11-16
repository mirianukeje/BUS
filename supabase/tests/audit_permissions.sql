-- Read-only: run in the Supabase SQL Editor. This does not test user sessions.
SELECT role_name,
       has_schema_privilege(role_name, 'public', 'USAGE') AS public_usage
FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name);

-- Effective privileges include inherited/PUBLIC grants, not only direct grants.
SELECT role_name, table_name, privilege,
       has_table_privilege(role_name, 'public.' || table_name, privilege) AS allowed
FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name)
CROSS JOIN (VALUES ('profiles'), ('check_ins'), ('journal_entries')) AS tables(table_name)
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                   ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) AS privileges(privilege)
ORDER BY role_name, table_name, privilege;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('profiles', 'check_ins', 'journal_entries');

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'check_ins', 'journal_entries')
ORDER BY tablename, cmd;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'check_ins', 'journal_entries');

SELECT c.relname AS table_name, con.conname,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('profiles', 'check_ins', 'journal_entries');

SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table = 'journal_entries';
