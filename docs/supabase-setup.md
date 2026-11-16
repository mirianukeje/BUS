# BUS development database

Sprint 1 database implementation is complete in `between-us-dev`. The developer
applied all three SQL migrations manually and completed the live API security and
timestamp tests with exit code 0. These files document the setup and repeatable
verification; they do not implement authentication or an application client.

**Migration history must be reconciled before automated migration deployment.**
Manual SQL Editor execution does not register CLI migration history. Do not replay
the applied migrations with `db push` or reset the remote database.

## Schema

| Table | Ownership | Data |
| --- | --- | --- |
| `public.profiles` | `id` references `auth.users.id` | Optional display name; creation time |
| `public.check_ins` | Required `user_id` references `auth.users.id` | Required emotion; optional note; creation time |
| `public.journal_entries` | Required `user_id` references `auth.users.id` | Optional title; required content; creation and update times |

All timestamps use `timestamptz` and default to `now()`. Check-in and journal IDs
default to `gen_random_uuid()`. Profiles use the existing Auth user's UUID; no
signup trigger or automatic profile creation is included. The authentication
owner can explicitly insert a profile after signup. Check-ins and journals do not
require a profile row first.

Migrations 1/2 reject empty strings and strings containing only ordinary spaces.
Applied migration 3 extends this to standard-whitespace-only text and protects
`created_at` from changes after insertion. See
[migration 3 validation](migration-3-validation.md) for behavior and repeatable tests.
Emotions remain free text until the team agrees on a vocabulary. Optional text can
be NULL. There is no one-check-in-per-day constraint. Both entry tables have an
index on `(user_id, created_at DESC)`; primary keys already have unique indexes.
Deleting an Auth user cascades to all three tables. Deleting a profile alone does
not delete that user's check-ins or journal entries.

The journal update trigger sets `updated_at` on every update. `now()` is the
transaction timestamp, so changes within one transaction may have identical times.
It runs with caller privileges and an empty search path, without elevated access.

## Environment setup

From the repository root:

```sh
cp .env.example .env.local
```

In the Supabase Dashboard, select **between-us-dev**. Copy its project URL and
publishable API key from the project's connection/API settings into `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

The project reference is the identifier in the URL, not the display name
`between-us-dev`. Do not put database passwords, secret API keys, service-role
keys, or user session tokens in these variables. `NEXT_PUBLIC_` values are exposed
to the browser. The publishable key identifies the application; user sessions and
RLS enforce access. `.env.local` is already ignored by Git. Restart the development
server after changing environment variables.

These variables alone do not connect the application. The authentication owner
should choose the shared Supabase client helpers and dependencies. No parallel
client or session implementation is introduced by this database work.

## Migration workflow for new environments and future changes

Use the Supabase CLI workflow so migration history stays aligned with Git.
Install the CLI using the [official installation instructions](https://supabase.com/docs/guides/local-development/cli/getting-started).
This repository currently contains migrations only, without `supabase/config.toml`.

1. Coordinate the target and timing with your teammate. Inspect the remote public
   schema and migration history first. If any of these tables or the trigger
   function already exist, stop and reconcile them; these migrations intentionally
   fail on duplicate objects rather than silently accepting a different schema.
   Existing remote work may need a coordinated baseline before these migrations.
2. Initialize the local CLI configuration and authenticate:

   ```sh
   supabase init
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase migration list
   supabase db push --dry-run
   ```

   Review generated CLI files before committing them, and keep local CLI caches
   and credentials out of Git. Use interactive credential prompts rather than
   placing passwords in command lines or committed files. Confirm the linked
   project really is `between-us-dev`. The dry run lists pending migrations; it
   does not prove SQL validity or policy behavior.
3. Once remote application is approved, run:

   ```sh
   supabase db push
   supabase migration list
   ```

   For a new database this applies all three migration files in timestamp order.
   All three already exist in the current development database, so reconcile
   recorded history before using this workflow there; none should be replayed.
   All use transactions. The first
   migration immediately enables RLS and removes client privileges, so a failure
   before the second leaves the tables closed to client access.
4. Verify the schema and run the tests in
   [database-security-tests.md](database-security-tests.md).

Do not run a remote database reset. The Sprint 1 migrations were applied through
SQL Editor; reconcile their history before any `db push`. Dashboard execution does
not maintain CLI migration history. After migrations are applied and shared, use new migration files for
changes instead of rewriting applied versions.

For an optional isolated rehearsal, initialize the CLI, install Docker, run
`supabase start`, then `supabase db reset` **without any remote/linked flag**.
The default reset rebuilds the local database and destroys its existing local
data. Use only a disposable local database. Run the security tests there too.

## Test the connection without changing the app

After applying migrations, use an API client such as Postman with:

```text
GET https://YOUR_PROJECT_REF.supabase.co/rest/v1/check_ins?select=id&limit=1
apikey: YOUR_SUPABASE_PUBLISHABLE_KEY
Authorization: Bearer USER_ACCESS_TOKEN
```

Obtain a normal signed-in user's access token through the team's existing auth
flow or an approved test session. Keep it private and out of screenshots, logs,
and Git. A successful request returns HTTP 200 with an array; `[]` is expected
when the user has no rows. This verifies API/database access as that user, not
complete isolation. Run the full security checklist next.

For a logged-out request, omit `Authorization` entirely. A permission error is
expected because anonymous table privileges are revoked. Never send the
publishable key as a bearer token. If requests fail, check the target URL/key,
session expiry, migration status, and whether `public` is exposed in Data API
settings. Do not disable RLS to troubleshoot.

## Security boundary

Authenticated clients receive only SELECT, INSERT, UPDATE, and DELETE privileges.
Each table has four ownership policies. SELECT/DELETE check existing ownership;
INSERT checks new ownership; UPDATE checks both, preventing ownership transfer.
Anonymous clients and PUBLIC receive no table privileges. No policy grants public
access. Database administrators and service-role/secret-key clients can bypass
RLS, so administrator queries cannot demonstrate end-user isolation. Supabase
anonymous Auth sessions, if enabled, use the authenticated role and can access
their own records; this setup does not change that Auth setting.

## References

- [Supabase migrations](https://supabase.com/docs/guides/local-development/database-migrations)
- [Supabase CLI reference](https://supabase.com/docs/reference/cli/introduction)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [API keys](https://supabase.com/docs/guides/getting-started/api-keys)
