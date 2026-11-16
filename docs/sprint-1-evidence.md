# Sprint 1 database verification evidence

## Source and scope

Target: `between-us-dev` (development). Branch: `olaniyi-s1`.
Evidence recorded on 2026-11-16 from terminal output and audit results supplied by
the developer in this conversation. This is user-executed evidence, not a claim
that the assistant independently accessed the remote database. The exact test
execution time was not captured. No emails, user IDs, keys, passwords, or tokens
are included.

## Reported permission audit

```text
authenticated_schema_access = true
authenticated_can_read = true
anonymous_can_read = false
```

The developer also reported that all three tables exist and their RLS policies
have been applied. These reported audit fields alone do not establish every
effective privilege; the two-user API run below verifies the exercised operations.

## Automated API security test

Command executed by the developer:

```sh
node --env-file=.env.local scripts/verify-database.mjs --run
```

Sanitized terminal output:

```text
PASS profiles: own CRUD, cross-user isolation, ownership transfer, anonymous denial
PASS check_ins: own CRUD, cross-user isolation, ownership transfer, anonymous denial
PASS journal_entries: own CRUD, cross-user isolation, ownership transfer, anonymous denial
PASS: all API ownership tests completed; fixtures removed.
Test exit code: 0
```

Both ordinary users exercised own-record CRUD; forged ownership inserts and
transfers were rejected; cross-user read/update/delete affected zero visible rows;
logged-out CRUD was denied. The successful path verified fixture deletion. The
developer subsequently unset session-token variables and removed the login helper.

## Additional constraint and trigger tests

The developer subsequently reported executing
`supabase/tests/constraints_and_timestamps.sql` with the SQL Editor result
`Success. No rows returned`. No individual PASS notice or exact execution time
was supplied. If the entire file was executed, that is consistent with all
baseline assertions passing and the final rollback completing. The baseline checks
NULL/empty/space-only required text, missing Auth foreign keys, UUID/time defaults,
and automatic journal updates. This is separate from the recorded API result.

Execution: replace only the placeholder UUID with a dedicated development Auth
user's ID, then run the entire file as one SQL Editor execution in `between-us-dev`,
after approval for transient test writes. Do not select just the INSERT statements.
The test creates only synthetic entries and a transaction-scoped helper; it does
not alter Auth users or existing application records. All writes and helper DDL
are rolled back. Admin access intentionally isolates constraints from RLS.

Expected: a PASS notice followed by ROLLBACK. Any unexpected success or wrong
SQLSTATE raises an exception. If execution errors and the session remains in an
aborted transaction, run `ROLLBACK;` before continuing. Do not commit the test
transaction. No account deletion/cascade test is performed.

## Migration 3 verification status

Migration 3 is prepared locally only. The new
`supabase/tests/strengthened_validation_and_timestamps.sql` is **not executed**.
The API runner has been extended with creation-time protection and separate-request
journal update-time assertions; this revised runner is **not yet executed remotely**.
The earlier PASS output above applies only to the original security suite on
migrations 1/2. Append new sanitized evidence after migration 3 and remote tests
are separately approved. See `migration-3-validation.md` for execution details.
