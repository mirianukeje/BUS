# Sprint 2 backend implementation and verification

Prepared on 2026-11-22 on `olaniyi-s2-check-in-data`. No remote migration, history
repair, reset, or test write was executed. No commit, push, or pull request was made.

## Reused Sprint 1 work

The existing `public.check_ins` schema already supports this feature: generated
UUID primary key, required Auth user FK, required non-whitespace emotion, nullable
note, database creation timestamp, creation-time immutability, user/date index,
authenticated CRUD grants, and four own-record RLS policies. Profiles and journals
have separate existing policies. No table or policy is recreated or changed.

The backend reuses the existing cookie-aware `lib/supabase/server.ts` client and
`lib/supabase/config.ts`. It verifies users with `auth.getUser()` per operation,
including Server Action calls that bypass the page. It does not use a service-role
key or change the existing authentication helpers, pages, proxy, or signup behavior.
The existing protected `/check-in` page is unchanged for Mirian's integration.

## New backend boundary

- `lib/check-ins/contracts.ts`: client-safe emotion options, input, saved record,
  submission result, validation result, field errors, and error codes.
- `lib/check-ins/validation.ts`: strict plain-object fields, eight valid emotions,
  type checks, and blank-note-to-NULL normalization. It preserves nonblank note
  formatting and introduces no arbitrary length cap.
- `lib/check-ins/server.ts`: server-only create/latest operations, verified session
  ownership, explicit write/read columns, own-user filtering, newest-first limit,
  and sanitized failures. Created IDs/times are omitted from inserts.
- `app/check-in/actions.ts`: independently validated/authenticated save and
  successful-save revalidation of `/check-in`.

The eight-option allowlist is an application contract. The existing database still
permits any non-whitespace emotion and does not normalize blank notes on raw REST
inserts. The backend enforces the stronger UI contract; no new SQL CHECK or trigger
was added. This distinction is deliberate and must not be misrepresented as a
new database-level allowlist/normalization guarantee.

Notes are user text, not HTML. The frontend should render them as ordinary React
text. Save failures can have uncertain outcomes if the connection fails after a
write; preserve the draft and check latest data before manually retrying. Multiple
check-ins per day remain allowed, without an idempotency guarantee.

## Migration-history finding

Repository evidence (`docs/supabase-setup.md` and `docs/sprint-1-evidence.md`) says
the three Sprint 1 migrations were applied manually in SQL Editor. No committed
CLI configuration or verified reconciliation record exists. Live migration history
was not queried because no administrative database connection is available here.
**Treat reconciliation as still required until an administrator verifies it.**

Before any automated deployment/new migration, compare the actual live schema to
all three versioned migrations and inspect the migration ledger. Only after review
and approval should existing versions be recorded as already applied using the
team's chosen Supabase CLI process. Do not run `db push`, reset the database, repair
history blindly, or replay the SQL against existing tables. No new migration is
needed for the requested create/latest feature, so none is proposed or created.

## Safe local validation

Run from the repository root:

```sh
npm run lint
npx tsc --noEmit
npm run build -- --webpack
node --check scripts/verify-check-ins.mjs
node --test scripts/check-ins-backend.test.mjs scripts/verify-database.test.mjs
```

The new test file transpiles the actual TypeScript modules with the already
installed TypeScript compiler, substituting Supabase and Next cache dependencies.
It reads no `.env.local`, makes no network calls, and writes no database records.
Cases cover all shared emotions, malformed payloads, unexpected/forged fields,
invalid emotion/note types, blank notes, uncapped multiline notes, verified ownership,
omitted generated columns, signed-out/configuration/network/database errors,
private-error sanitization, scoped latest reads, empty history vs failure, action
authentication, and success-only page revalidation. The unchanged Sprint 1 mocked
runner tests are included as regression checks.

Local test success proves the exercised backend behavior with substituted
dependencies, not the live database's current policies. Live RLS tests and actual
cookie/action/UI integration remain separate acceptance work.

Results on 2026-11-22: lint, standalone TypeScript, Webpack production build,
runner syntax checks, and all 16 local tests passed (13 new backend/runner-guard
cases plus 3 unchanged Sprint 1 runner regression cases). No external requests were
made by the tests. The initial TypeScript/build run found duplicate generated files
named `* 3.ts` under `.next/dev/types`; four were preserved outside the repository
in a task temporary directory. The repeated checks passed. This addresses the
local generated-file collision, not application source configuration. The original
uncommitted `next-env.d.ts` content was restored after build generation.

## Focused live API verification (prepared, not executed)

`scripts/verify-check-ins.mjs` uses only `check_ins`. It accepts ordinary existing
test accounts with profiles; it never creates/deletes profiles or journals. This
avoids the original Sprint 1 runner's requirement for profile-free accounts while
leaving all Sprint 1 scripts unchanged.

After explicit approval for development test writes, use two dedicated normal
user access tokens (no refresh/admin/service-role keys), supply the project's
publishable key through the existing `.env.local`, and confirm the expected project
reference separately. In zsh, capture values privately:

```sh
read -r 'BUS_TEST_PROJECT_REF?Approved development project reference: '
read -rs 'BUS_TEST_TOKEN_A?User A access token: '; echo
read -rs 'BUS_TEST_TOKEN_B?User B access token: '; echo
export BUS_TEST_PROJECT_REF BUS_TEST_TOKEN_A BUS_TEST_TOKEN_B
node --env-file=.env.local scripts/verify-check-ins.mjs --run
echo "Test exit code: $?"
unset BUS_TEST_PROJECT_REF BUS_TEST_TOKEN_A BUS_TEST_TOKEN_B
```

Use Node 24+ for its built-in TypeScript stripping of the shared contract import.
The runner stops before requests unless `--run`, required settings, a matching
HTTPS development-project hostname, and a publishable key are supplied. An explicit
project reference prevents accidental target mismatch; it does not independently
prove the project is development. Verify it in the Dashboard before running.
Inherited shell variables override `.env.local`; check for unintended overrides.

The script verifies database-generated IDs/times, owned inserts/reads, cross-user
invisibility, forged ownership denial, anonymous read/insert denial, database
required-text rejection, NULL-note storage, and timestamp protection. Arbitrary
nonblank emotions are not rejected by the current SQL schema: allowlist validation
and blank-note conversion are tested through the actual backend in local unit tests
and must also be checked via Mirian's real form during integration.

Synthetic notes contain a per-run random marker. Cleanup targets only returned
fixture IDs, or exact markers for uncertain insert outcomes, using both test
sessions; it verifies absence visible to each. No broad user-record deletion occurs.
Interrupted processes, unavailable connections, or expired sessions can still
prevent cleanup. Inspect only that test run's synthetic records if it fails.

Expect a focused security PASS followed by `PASS: check-in test fixtures removed;
profiles and journals untouched.` and exit code 0. Do not paste tokens, response
bodies, user notes, or user identifiers into evidence. No live PASS is claimed yet.

## Handoff and completion boundary

See [Mirian's integration guide](sprint-2-backend-handoff.md) for exact imports,
input/results, frontend example, and latest-record rendering. Confirm browser save,
refresh, two-user isolation, expired sessions, and failure feedback after frontend
wiring. Private Journal and Guided Reflection remain out of scope. The backend
does not add new UI, signup hooks, schema migrations, dependencies, or scripts to
`package.json`.

Suggested commit message: `Implement secure Sprint 2 check-in backend and handoff`.
