# Sprint 1 database review and execution guide

Migration 3 is now prepared locally, not applied remotely. The updated API runner
requires it and adds creation-time protection and cross-transaction journal time
checks. See [the migration 3 guide](migration-3-validation.md) before rerunning.

## Review outcome

The checked-in migrations define three tables with Auth foreign keys, cascading
account deletion, required/nonblank fields, timezone-aware timestamp defaults,
user/date indexes, and a journal update trigger. They explicitly grant authenticated
users SELECT/INSERT/UPDATE/DELETE, revoke anonymous/PUBLIC table privileges, and
define twelve RLS policies. UPDATE checks both old and new ownership. UUID defaults
do not need sequence privileges. The trigger's function EXECUTE privilege is checked
when the trigger is created; its PUBLIC revoke is not a reason to grant every API
user function access.

These are static findings. Applying files successfully does not prove that live
privileges, policies, or the Data API settings still match. No remote SQL or API
tests were executed during this review. Existing application and auth files are
unchanged. Already-applied migrations were not edited.

The local `.env.local` contains both required variable names, an HTTPS Supabase
project URL, and an `sb_publishable_` key. Values were not printed. Format checks do
not establish that the URL/key refer to `between-us-dev` or that the key is valid.
Confirm the pair in that project's Dashboard. The template contains placeholders;
`.env.local` is ignored by Git. No Supabase SDK or client helper currently connects
the application; coordinate that integration with the authentication owner.

## 1. Read-only database audit

Open `supabase/tests/audit_permissions.sql` and run its SELECT statements in the
Supabase SQL Editor for **between-us-dev**. No records or privileges are changed.

Expected results:

- `authenticated` has `public_usage = true`.
- For every table, authenticated SELECT/INSERT/UPDATE/DELETE are true and
  TRUNCATE/REFERENCES/TRIGGER are false.
- Every tested privilege is false for `anon`. Anonymous schema USAGE can be true;
  schema visibility does not by itself grant record access.
- All three tables have RLS enabled. Twelve expected policies target
  `authenticated`, with ownership predicates matching the migrations. Check for
  unexpected additional policies: permissive policies can broaden access.
- Primary keys, foreign keys, required text checks, user/date indexes, and the
  journal BEFORE UPDATE trigger match the applied migrations. After migration 3,
  also expect three creation-time protection triggers and stronger text CHECKs.

Do not use administrator SELECT results to judge user isolation. SQL Editor users
often bypass RLS. The effective-privilege audit also catches inherited grants that
are harder to see in a list of direct grants.

## 2. Check custom Data API permissions

In the project's Data API settings, confirm the API is enabled and `public` is an
exposed schema. All BUS tables are in `public`; no custom schema is required.
Custom/default API permissions can suppress automatic grants for new tables.
The explicit table grants in migration 2 handle that for these three tables, but
they do **not** grant schema USAGE. If the audit shows authenticated schema USAGE
is false, even correct table privileges and RLS policies cannot permit access.

The narrowly scoped remedy would be a new, reviewed migration containing:

```sql
GRANT USAGE ON SCHEMA public TO authenticated;
```

This is a proposed fix only; it has not been applied. Do not change default grants
globally or grant all tables to anonymous users. Future tables need their own
explicit grants and policies too.

| API symptom | Check |
| --- | --- |
| Authenticated `42501`, permission denied for schema public | Schema USAGE |
| Authenticated `42501`, permission denied for table | Effective table grants |
| INSERT/UPDATE `42501`, row-level security violation | JWT user ID vs row ownership |
| Successful SELECT with `[]` | User has no visible rows; test a known owned fixture |
| Table missing from API/schema cache | Applied schema, exposure settings, Data API status/cache |
| Invalid key/JWT | Correct project's publishable key, actual user token and expiry |

Send the publishable key in `apikey`, and a user's session JWT in Authorization.
Do not use a publishable key as a bearer token. See
[API keys](https://supabase.com/docs/guides/getting-started/api-keys),
[API security](https://supabase.com/docs/guides/api/securing-your-api), and
[schema access](https://supabase.com/docs/guides/api/using-custom-schemas).

## 3. Automated two-user API tests (writes test fixtures)

Do not run this step until remote test writes are approved. It inserts, updates,
and deletes synthetic rows in the configured project. Cleanup cannot be guaranteed
if the network fails, sessions expire, or policies deny it. It does not create Auth
users, apply migrations, or change project permissions.

1. Prepare **two dedicated ordinary test accounts** through the team's approved
   Auth workflow. Both must have no existing profile. If automatic profile creation
   is later added by your teammate, use the manual test guide instead; the runner
   stops rather than overwrite profiles. Use no personal data in either account.
2. Obtain their current session access tokens, without changing auth pages. These
   are user JWTs, not refresh tokens, publishable keys, or service-role keys.
3. In the project's zsh terminal, enter tokens without displaying them or putting
   their literal values in command history:

   ```sh
   read -rs 'BUS_TEST_TOKEN_A?User A access token: '; echo
   read -rs 'BUS_TEST_TOKEN_B?User B access token: '; echo
   export BUS_TEST_TOKEN_A BUS_TEST_TOKEN_B
   ```

4. With Node 20.6+ and approval for test writes, run:

   ```sh
   node --env-file=.env.local scripts/verify-database.mjs --run
   ```

   Existing shell variables override `--env-file`; ensure they do not point at a
   different project. The script uses built-in fetch and installs no dependencies.
   It validates both sessions, rejects identical/anonymous identities, and checks
   for existing profiles before writing fixtures.
5. Expected output is one PASS line per table, followed by:

   ```text
   PASS: all API ownership tests completed; fixtures removed.
   ```

   Exit code 0 means all executed API assertions passed. Nonzero means the run
   failed or cleanup was incomplete. Session validity and API reachability are
   prerequisites; invalid tokens are not evidence of correct database isolation.
6. Clear tokens from the shell:

   ```sh
   unset BUS_TEST_TOKEN_A BUS_TEST_TOKEN_B
   ```

The runner additionally tests both users' creation-time protection, normal updates
resending unchanged creation time, and journal update-time advancement across
requests. Expected table PASS lines now include `timestamp protection`, followed
by a separate journal advancement PASS. It tests both users' own inserts, reads, updates, and deletes; both
directions of forged inserts and ownership transfers; invisible cross-user reads,
updates, and deletes; and logged-out CRUD denial on every table. It verifies
affected rows, not just HTTP success, and rechecks attempted changes as the owner.
Cleanup targets only the synthetic IDs registered for that run. If cleanup fails,
inspect the indicated fixture IDs using the dedicated accounts and approved admin
procedures. Do not disable RLS to get a passing test.

For Postman steps, constraint checks, timestamp checks, and expected HTTP behavior,
use [the manual acceptance tests](database-security-tests.md). The runner does not
test account deletion, all constraints, or every possible database grant.

## 4. Record evidence

Record the target project, applied migration versions, audit results, test date,
PASS/FAIL output, and cleanup status in the Sprint 1 PR. Do not attach `.env.local`,
tokens, passwords, keys, or private response bodies. This provides evidence of the
live implementation rather than treating a static review as a runtime pass.
