# Draft pull request

## Title

Sprint 1: add BUS Supabase schema, ownership security, and database verification

## Description

BUS now has versioned PostgreSQL definitions for profiles, emotional check-ins,
and journal entries. Records reference Supabase Auth users; authenticated users
can manage their own records through explicit CRUD grants and twelve RLS policies.
Anonymous table access and cross-user ownership transfers are denied.

The schema includes required-field constraints, cascading Auth foreign keys,
per-user date indexes, timestamp defaults, and an automatic journal update trigger.
A third migration rejects standard-whitespace-only required text and prevents
changes to creation timestamps without rewriting the two applied migrations.
Environment placeholders and setup documentation support the development project
without committing credentials or implementing a competing authentication client.

Verification tools include a two-user API security runner, a read-only permission
audit, and rollback-only constraint/trigger tests. Sanitized results from the
developer's security test run are recorded in `docs/sprint-1-evidence.md`.

### Validation

- Two-user API tests: PASS for all three tables; exit 0; temporary fixtures removed
  (executed by the developer against `between-us-dev`).
- Webpack production build and TypeScript validation: PASS after isolating duplicate
  generated development type files; JavaScript syntax check: PASS.
- SQL/PL/pgSQL parser validation: PASS; three local mocked timestamp-runner
  regression tests: PASS (no external requests).
- Credential/format review: no credential literals found in candidate files;
  `.env.local` remains ignored.
- Baseline constraint/trigger SQL: developer reported `Success. No rows returned`;
  this indicates assertion success if the whole file was executed.
- Migration 3, strengthened rollback tests, and revised API timestamp tests:
  prepared locally; application and runtime verification pending approval.
- ESLint: blocked by the existing empty configuration and generated-file scanning;
  requires follow-up with the application setup owner.

### Scope and follow-up

This branch also contains the earlier scaffold repair commit: a root layout,
placeholder routes, PostCSS configuration, generated Next type imports, and a
TypeScript cache ignore rule. Database finalization does not modify authentication
or interfaces. Confirm the scaffold changes with the application owner before merge.

The developer reports applying both migrations to the development project; remote
changes were not performed by this final review. Automatic signup profiles, session
handling, and application integration remain with the authentication owner.
Migration 3 is not yet applied remotely. Its data preflight aborts on invalid rows
without changing them. Initial timestamps may still be supplied on INSERT;
creation-time immutability begins afterward. Existing RLS policies are unchanged.
