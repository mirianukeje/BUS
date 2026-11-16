# Migration 3: whitespace validation and creation-time protection

Status: prepared locally; **not applied to Supabase**. Remote execution and test
writes require separate approval. Migrations 1 and 2 are unchanged.

## Behavior

`20261116000300_strengthen_validation_and_timestamps.sql` replaces the two original
text CHECKs with `value ~ '[^[:space:]]'`: at least one non-whitespace character is
required. Existing NOT NULL constraints remain in place. Standard spaces, tabs,
newlines, carriage returns, form feeds, and vertical tabs alone are rejected.
Normal text with spaces or line breaks remains valid. Non-ASCII whitespace
classification depends on PostgreSQL's database locale; this is not a guarantee
about every Unicode whitespace code point. Optional fields remain nullable.

Three BEFORE UPDATE triggers reject changes to `created_at`, including NULL,
using SQLSTATE `23514` and constraint diagnostic `bus_created_at_immutable`.
Sending its existing value unchanged succeeds. The shared function is SECURITY
INVOKER with an empty search path. No Auth object, RLS policy, table grant, or
existing journal update trigger is changed. The new journal trigger sorts before
`journal_entries_set_updated_at`; rejected updates roll back the whole statement,
including any attempted journal timestamp changes.

Initial timestamps may still be supplied during INSERT. This migration makes
creation times immutable after insertion; it does not force server timestamps at
creation. Database administrators can change schema/disable triggers and are not
the security boundary for application-user protection.

## Compatibility and live preflight

Migration 1 defines one unnamed column CHECK on each affected text column.
PostgreSQL assigns the names `check_ins_emotion_check` and
`journal_entries_content_check`. These match the DROP CONSTRAINT statements.
No object name collides with migrations 1 or 2. New CHECK names are
`check_ins_emotion_nonblank_check` and `journal_entries_content_nonblank_check`.

The local definitions were reviewed, but live constraint names have not been
queried by the assistant. Before applying migration 3, run this **read-only** query
in `between-us-dev` and confirm the original names and definitions:

```sql
SELECT c.relname AS table_name, con.conname,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND con.contype = 'c'
  AND c.relname IN ('check_ins', 'journal_entries')
ORDER BY c.relname, con.conname;

SELECT 'check_ins' AS table_name, count(*) AS invalid_rows
FROM public.check_ins
WHERE emotion IS NULL OR emotion !~ '[^[:space:]]'
UNION ALL
SELECT 'journal_entries', count(*)
FROM public.journal_entries
WHERE content IS NULL OR content !~ '[^[:space:]]';
```

Both invalid-row counts should be zero. Do not delete or automatically normalize
records if they are not; stop for a separate data-resolution decision. Counts do
not expose record content. A missing/renamed original CHECK also requires review.

The migration locks all three tables while checking data and installing the
constraints/triggers, briefly blocking other access. A 5-second lock timeout and
30-second statement timeout fail safely if the database is busy. The full migration
is transactional: invalid data, missing objects, or errors leave existing records
and definitions unchanged after rollback. Avoid application activity during the
approved development migration window.

Use the established migration workflow only after approval. Confirm migration
history before `db push`, especially if migrations 1/2 were pasted into SQL Editor:
their existing tables do not imply CLI history was recorded. Do not replay those
files or use migration-history repair commands without a coordinated review.
Only migration 3 should be newly applied. This guide does not authorize execution.

## Rollback-only SQL tests

After migration 3 is approved and applied, use
`supabase/tests/strengthened_validation_and_timestamps.sql`. Keep the earlier
constraint/FK/default test as baseline coverage; it remains compatible.

1. Choose a dedicated development Auth user with no profile row, and replace only
   the new test file's UUID placeholder locally. Do not commit that substitution.
2. Run the **whole file** in one SQL Editor execution as the administrator.
3. Expect group PASS notices for NULL, standard whitespace, valid multiline text,
   optional fields, each table's creation-time protection, and normal updates.
   The final notice reports all assertions passed, followed by `ROLLBACK`.
   The editor may instead display only `Success. No rows returned`; whole-file
   success without an exception means all assertions ran successfully.
4. All synthetic records, temporary helper creation, and local settings roll back.
   Existing application records and Auth users are untouched. If an error leaves
   the session in an aborted transaction, issue `ROLLBACK;` before continuing.

The negative tests check exact SQLSTATEs and named constraint diagnostics, so
another failure such as RLS denial cannot be mistaken for text validation. Vertical
tabs use PostgreSQL's octal `\013` string escape. SQL now() is constant within the
transaction: a newly inserted, backdated journal fixture verifies advancement to
transaction time without sleeping or editing an existing row.

## Two-user API regression and cross-transaction timestamps

The updated `scripts/verify-database.mjs` now **requires migration 3**. Use the
dedicated accounts and private token instructions in
[the execution guide](sprint-1-database-review.md). No profile may already exist.
After separate approval for remote test writes:

```sh
node --env-file=.env.local scripts/verify-database.mjs --run
```

For both users on each table, the runner still verifies owned CRUD, forged inserts,
cross-user reads/updates/deletes, ownership transfer denial, and anonymous CRUD
denial. It also verifies:

- Normal updates resending the unchanged creation timestamp succeed.
- Changing the creation timestamp or setting it to NULL is rejected by the new
  trigger, and a reread confirms no change.
- Each journal update occurs in a separate HTTP request/transaction and advances
  `updated_at` relative to its INSERT response. A 25ms pause avoids ambiguous
  comparisons at JavaScript's millisecond precision.
- Rejected timestamp updates leave journal `updated_at` unchanged too.

Expect a PASS line with `timestamp protection` for every table, an additional
`PASS journal_entries: updated_at advances across transactions`, and the final
fixture-removal PASS with exit code 0. Original recorded security evidence predates
these assertions and must not be presented as a pass for the updated runner.

Success-path fixture deletion is verified; error cleanup remains best effort.
The runner has no project allowlist: confirm `.env.local` targets `between-us-dev`,
use no production tokens, and avoid concurrent profile creation. Inspect synthetic
fixtures after any failed/interrupted run; never disable RLS to make tests pass.

## Evidence to collect after approval

Record live constraint-name/preflight results, application of migration 3, rollback
SQL results, and updated API output/exit code in `sprint-1-evidence.md`. Do not
include user IDs, keys, credentials, or private response bodies. Local syntax or
build checks are not evidence that the new migration is applied or passes remotely.

## Local checks completed

- All SQL and PL/pgSQL blocks in the three migrations and three SQL test/audit
  files passed parsing with a temporary PostgreSQL parser outside the repository.
- `node --check scripts/verify-database.mjs` passed.
- `node --test scripts/verify-database.test.mjs` passed all three local mocked
  cases: correct behavior, missing creation-time protection, and a nonadvancing
  journal update timestamp. These mocks test the runner, not PostgreSQL behavior;
  they replace every fetch and never read `.env.local` or contact Supabase.
- `npm run build -- --webpack` passed, including TypeScript checks.
- `npm run lint` still fails on the existing empty ESLint config and generated
  `.next` files (59 errors, 20 warnings); no authentication/interface/setup config
  was changed to address that separate issue.

No database runtime tests were available locally: PostgreSQL/Supabase CLI are not
installed, and the Docker daemon is not running. Parser success does not verify
live objects, data, RLS, or trigger execution. The first two migrations and tracked
source/configuration files are checked for byte-for-byte preservation separately.
