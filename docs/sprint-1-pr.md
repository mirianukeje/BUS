# Pull request handoff

## Title

Sprint 1: BUS Project Setup, Supabase Database and Security Implementation

## Description

The BUS Sprint 1 foundation now includes the Next.js project scaffold and a
Supabase PostgreSQL database for profiles, emotional check-ins, and journal entries.
Mirian reviewed and approved the interface scaffold changes, as confirmed by the
author. Authentication and application client integration remain separate work.

## Implementation

- Next.js root layout, homepage, check-in and journal placeholders, and PostCSS setup.
- Three SQL migrations: tables/constraints/indexes/defaults; ownership-based RLS
  and authenticated CRUD privileges; stronger whitespace validation and timestamp
  protection. Anonymous and cross-user access are denied by grants and policies.
- Required emotion/content validation rejects standard-whitespace-only values.
  Creation timestamps cannot change after insertion; normal edits still work and
  journal update timestamps are refreshed automatically.
- SQL audit and rollback tests, a two-user API security/timestamp runner, and local
  mocked regression tests.
- Approved Next.js Core Web Vitals and TypeScript ESLint configuration with
  generated files excluded and application source files included.
- Setup documentation, credential-free environment template, portable test-user
  placeholders, and sanitized Sprint 1 verification evidence.

## Verification

- Live Supabase API security tests: PASS for all three tables, exit code 0,
  including owned CRUD, cross-user restrictions, ownership transfers, and anonymous
  access denial (executed by the author against `between-us-dev`).
- Live timestamp tests: PASS for creation-time protection on all tables and journal
  `updated_at` advancement across transactions. Temporary API fixtures were removed.
- SQL constraint/timestamp verification: author reports completion; baseline SQL
  success is recorded. A separate detailed strengthened SQL result log was not supplied.
- `npm run lint`: PASS, no errors or warnings.
- `npx tsc --noEmit`: PASS.
- `npm run build -- --webpack`: PASS.
- Runner syntax checks and three local mocked regression tests: PASS.
- Credential scan and final diff review: no credentials or generated build output
  included; `.env.local` remains ignored.

See `docs/sprint-1-evidence.md` for the exact sanitized API results.
The default Turbopack build previously hit an environment worker-port restriction;
Webpack is the verified production build for this handoff.

## Migration deployment note

All three Supabase migrations were applied **manually** in SQL Editor to
**between-us-dev**. **Migration history must be reconciled before automated
migration deployment.** Do not replay the applied files with `db push` or reset
the remote database. No remote migration or history repair was performed as part
of this cleanup.

Initial timestamps remain client-suppliable on INSERT; immutability applies after
creation. Destructive account-deletion cascade tests were not run. This PR does
not implement authentication flows or live application data integration.
