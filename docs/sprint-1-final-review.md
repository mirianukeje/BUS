# Sprint 1 pre-commit review

Reviewed on 2026-11-16 on `olaniyi-s1`, against local `main`. Remote branch state
was not fetched or compared. No commit, push, remote test, or deployment was made.

## Branch contents

Existing commit `0a31737` adds the root layout and placeholder pages, PostCSS
configuration, a generated Next type-path update, and an ignore rule for TypeScript
build caches. These are already part of this branch relative to local main, even
though the new database work does not edit interfaces. Coordinate this existing
scaffold scope with the teammate before opening the PR; no history was rewritten.

New files cover three SQL migrations, a placeholder environment template, setup and
security documentation, the API security runner, read-only permission audit,
rollback constraint/trigger tests, sanitized evidence, and a draft PR description.
No authentication implementation, application client, SDK dependency, or UI change
was added in this finalization work. Database files remain untracked until staged.

## Constraint/trigger review

- Auth foreign keys are required, use UUIDs, and cascade when an Auth user is
  deleted. Entry records do not depend on a profile row. No profile signup trigger
  is installed, avoiding overlap with authentication work.
- Applied migrations 1/2 use NOT NULL plus `length(btrim(...)) > 0`. Prepared
  migration 3 replaces the CHECKs with a non-whitespace-character regex, covering
  standard whitespace. It preserves NOT NULL and optional fields. Non-ASCII
  whitespace classification depends on database locale.
- Primary keys provide uniqueness, entry UUID defaults avoid sequence permissions,
  and composite indexes support per-user date queries. There is no fixed emotion
  vocabulary, length limit, or one-check-in-per-day constraint.
- Required `timestamptz` columns default to transaction time. The BEFORE UPDATE
  trigger replaces journal `updated_at` with `now()` even if a client supplies a
  different update time; it leaves `created_at` alone.
- Prepared migration 3 rejects changes to `created_at` on all three tables, while
  unchanged values and normal edits remain valid. Initial timestamps are still
  client-suppliable on INSERT, so this does not provide audit-grade provenance.
- The trigger is SECURITY INVOKER, uses an empty search path, and needs no
  privileged signup hook. The function privilege revoke does not block the existing
  trigger from firing.

## Checks and evidence

| Check | Result |
| --- | --- |
| User-executed original two-user API security suite | PASS, all three tables, exit 0; predates migration 3 and new timestamp assertions |
| `node --check scripts/verify-database.mjs` | PASS |
| `node --test scripts/verify-database.test.mjs` | PASS: three mocked local tests, no external requests |
| SQL/PL/pgSQL parsing | PASS: all six SQL files parsed with temporary pglast 8.8/PostgreSQL 18 parser; no project dependency added |
| `npm run build -- --webpack` | PASS, including TypeScript; no duplicate type cleanup needed on latest run |
| `npm run lint` | FAIL: empty ESLint config, generated `.next` files included, missing plugin rule definitions (59 errors, 20 warnings in this run) |
| Credential/format scan of candidate database files | No local key matches, key/JWT literals, or trailing whitespace found |
| `.env.local` Git ignore | Confirmed ignored; only placeholder `.env.example` is a candidate |
| Baseline rollback SQL | Developer reported whole-script-style success; see evidence qualification |
| Migration 3 / new rollback SQL / revised API runner | Prepared, not executed against a database; no local PostgreSQL/Supabase CLI; Docker daemon unavailable |

The initial Webpack build failed on duplicate `LayoutProps` declarations from
`.next/dev/types/* 2.ts`. Four duplicate generated files were preserved outside
the project in a task temporary directory; no tracked source/configuration was
changed, and the repeated build passed. Duplicates may recur under synchronized
folders; investigate with the application owner if they return. The default
Turbopack build was not rerun in this final review; earlier sandbox attempts could
not bind its worker port. Webpack success is not a Turbopack runtime claim.

## Remaining actions before a clean sign-off

1. Review the live original CHECK names and invalid-row counts using the read-only
   queries in `migration-3-validation.md`. Local migration 1 uses the expected
   PostgreSQL-generated names; live names have not been queried by the assistant.
   Obtain approval before applying migration 3 or running remote write tests.
2. After migration 3, execute the new rollback test and revised API runner; record
   new results without relabeling the old security PASS. Runtime assertions remain
   unverified. Account-deletion cascades are not tested.
3. Have the application setup owner configure ESLint and generated-file ignores;
   do not represent the current lint command as passing.
4. Review existing scaffold changes in the branch with the teammate, plus any
   changes on the actual PR base. No automatic branch cleanup was performed.
5. Review/stage the intended files, then obtain approval before commit or push.

The API runner targets whichever project is configured, not an enforced allowlist.
Its success path verifies fixture deletion, while error cleanup is best effort and
does not independently confirm absence after every cleanup request. Keep using
dedicated development accounts, avoid concurrent profile creation, and inspect
fixtures after any failed/interrupted run. The recorded successful run completed
cleanup; no rerun was performed here.
