# Sprint 1 database verification evidence

## Source and scope

Target: `between-us-dev` (development). Branch: `olaniyi-s1`.
Evidence finalized on 2026-11-16 from terminal output and completion reports
provided by the developer. Live database tests were executed by the developer,
not independently rerun by the assistant. Exact execution times were not captured.
No emails, user IDs, passwords, keys, or session tokens are included.

All three versioned SQL migrations were applied manually in the Supabase SQL
Editor. Migration history must be reconciled before automated migration deployment;
do not replay these migrations or reset the remote database.

## Permission audit

Developer-reported results:

```text
authenticated_schema_access = true
authenticated_can_read = true
anonymous_can_read = false
```

All three tables exist with RLS enabled and ownership policies applied. The API
suite below verifies the exercised operations beyond this read-access audit.

## Completed API security and timestamp test

Command executed by the developer:

```sh
node --env-file=.env.local scripts/verify-database.mjs --run
```

Sanitized output supplied by the developer:

```text
PASS profiles: own CRUD, cross-user isolation, ownership transfer, anonymous denial, timestamp protection
PASS check_ins: own CRUD, cross-user isolation, ownership transfer, anonymous denial, timestamp protection
PASS journal_entries: own CRUD, cross-user isolation, ownership transfer, anonymous denial, timestamp protection
PASS journal_entries: updated_at advances across transactions
PASS: all API ownership tests completed; fixtures removed.
Test exit code: 0
```

Both ordinary users can create, read, update, and delete only their own records.
Forged ownership and ownership transfers are rejected; cross-user reads and writes
do not expose or alter the other user's fixtures. Logged-out CRUD is denied.
Changes to `created_at`, including NULL, are rejected on every table; normal
updates resending the unchanged creation time succeed. Journal `updated_at`
advances across separate requests, while rejected updates leave timestamps intact.
Temporary fixtures were removed, and the developer cleared token variables and
the login helper afterward. The earlier security-only suite also passed with exit 0.

## SQL constraint and timestamp verification

The developer reports completed database constraint/timestamp verification. The
baseline `constraints_and_timestamps.sql` result supplied was
`Success. No rows returned`. Whole-file execution without an exception confirms
its assertions completed and final rollback ran; no per-assertion result table is
produced. A separate detailed result log for the strengthened SQL suite was not
supplied, so its individual assertions are not claimed as independently observed.
The exact updated API timestamp PASS output is retained above.

The two SQL suites cover required text, standard-whitespace-only input, foreign
keys, defaults, ordinary updates, and timestamp triggers. Both run in transactions
ending in ROLLBACK, including helper creation and synthetic records. They do not
change Auth users or existing application records. RLS is verified separately
through user-token API requests, not administrator SQL.

For reruns, replace `REPLACE_WITH_DEDICATED_TEST_USER_UUID` only in an SQL Editor
copy or an uncommitted local copy. Use an existing dedicated development user
without a profile for the strengthened suite. Run the whole file and retain its
final ROLLBACK; never commit the test transaction or the substituted identifier.

## Local project verification

Finalization checks passed:

- `npm run lint`: no errors or warnings; application TSX and database scripts
  included, generated files excluded by the approved ESLint configuration.
- `npx tsc --noEmit`: passed.
- `npm run build -- --webpack`: production build passed.
- `node --check scripts/verify-database.mjs` and the local test file: passed.
- `node --test scripts/verify-database.test.mjs`: three mocked regression tests
  passed, without remote requests.
- Credential scan: no matching local credentials, key/JWT/private-key literals,
  or credential-bearing database URLs found in intended files; `.env.local` is
  ignored and no generated build artifacts are included.

The default Turbopack build previously hit an environment worker-port restriction
(`Operation not permitted`). Webpack is the verified production build for this
handoff. No claim is made that this restriction was fixed by ESLint.

## Remaining operational notes

Reconcile manual migration history before CLI/automated deployment. Authentication
and application client integration remain separate work. Account-deletion cascade
behavior is defined in the foreign keys but was not exercised destructively.
Initial timestamps can still be supplied on INSERT; creation-time protection
applies afterward. Failed/interrupted API reruns require fixture inspection because
error cleanup is best effort. No new remote database changes were made during
final cleanup.
