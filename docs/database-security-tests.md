# Database acceptance tests

After migration 3, also run the rollback tests and updated API runner described in
[migration 3 validation](migration-3-validation.md). The original FK/default tests
remain applicable; the new suite covers additional whitespace and immutable
creation times. Migration 3 and its new tests have not been run remotely here.

Run after migrations are applied to an approved disposable local database or
`between-us-dev`. Use synthetic content only. These procedures have not been run
against the remote project by this change.

## Prepare two identities

Coordinate with the authentication owner to create two ordinary development users
(A and B) using the existing auth flow. Record their UUIDs and obtain separate,
valid user access tokens. Do not use administrator or service-role credentials.
Profile rows are not created automatically. If a profile already exists from auth
work, use it instead of inserting a duplicate.

In Postman or another API client, define private, unshared variables:

- `base_url`: the project's Supabase URL
- `publishable_key`: the project's publishable key
- `token_a`, `token_b`: the users' session access tokens
- `user_a`, `user_b`: their UUIDs

Do not export tokens, commit API client environments, or share screenshots of
authorization headers. For each signed-in request set:

```text
apikey: {{publishable_key}}
Authorization: Bearer {{token_a}}
Content-Type: application/json
Prefer: return=representation
```

Switch the bearer token to test B. URL patterns below use Postman variable syntax.

## Seed owned rows through the API

As A, POST each endpoint with its matching body, substituting the actual UUID:

| Endpoint | JSON body |
| --- | --- |
| `{{base_url}}/rest/v1/profiles` | `{"id":"USER_A_UUID","display_name":"Test A"}` |
| `{{base_url}}/rest/v1/check_ins` | `{"user_id":"USER_A_UUID","emotion":"hopeful","note":"Synthetic test"}` |
| `{{base_url}}/rest/v1/journal_entries` | `{"user_id":"USER_A_UUID","title":"Test entry","content":"Synthetic reflection"}` |

Expect HTTP 201 and returned rows. Save the generated entry IDs. Repeat as B,
using B's UUID and distinguishable content. Confirm timestamps are populated and
the generated IDs are different. Never insert test users directly into `auth.users`.

## Ownership matrix

Repeat every row of this matrix for **all three tables**, then swap A and B and
repeat. Use `id` as the ownership field for profiles and `user_id` for entry tables.
For updates use `display_name`, `note`, or `title` as an editable field.

| Request made as A | Expected result |
| --- | --- |
| GET `/rest/v1/TABLE?select=*` | Only A's rows; never B's |
| GET `/rest/v1/TABLE?id=eq.B_ROW_ID&select=*` | HTTP 200, empty array |
| POST a valid row owned by A | Success (for profiles, use the original seed insert; only one profile per user) |
| POST a row owned by B | Rejected; no row inserted |
| PATCH `/rest/v1/TABLE?id=eq.A_ROW_ID` with an editable field | HTTP 200, A's updated row returned |
| PATCH `/rest/v1/TABLE?id=eq.B_ROW_ID` with an editable field | Empty array; B's row unchanged |
| PATCH A's row, changing its ownership field to B's UUID | Rejected; ownership unchanged |
| DELETE `/rest/v1/TABLE?id=eq.B_ROW_ID` | Empty array; B's row remains |
| DELETE `/rest/v1/TABLE?id=eq.A_ROW_ID` | Success; A's row returned and subsequently absent |

Perform deletion last. Verify B's records with B's token after cross-user update
and delete attempts. An HTTP success with zero affected rows is expected for
invisible rows; do not mistake this for a successful cross-user modification.
INSERT/ownership-change failures generally return a 4xx response. A profile insert
or ownership change targeting B can also fail on its unique primary key; this
alone is not proof of RLS. Use the cross-user read/update/delete checks and policy
inspection below as well.

## Logged-out access

Remove the Authorization header completely, keep only the publishable `apikey`,
and attempt SELECT, INSERT, UPDATE, and DELETE on each table. Use valid fixture
bodies and saved IDs. All twelve requests should be denied (typically HTTP 401 or
403); no records should be exposed or changed. Re-read fixtures as their owners.
Sending an expired token tests invalid authentication, not logged-out access.

## Constraints and timestamps

Using A's token:

1. Omit emotion or send `"emotion":"   "` in a check-in: rejected.
2. Omit content or send `"content":""` in a journal entry: rejected.
3. Set `user_id` to NULL: rejected. Set it to another UUID: rejected by ownership
   checks (and by the foreign key if no Auth user exists).
4. Omit optional text fields: succeeds; NULL is allowed.
5. Create a journal entry, note `created_at` and `updated_at`, then update its
   content in a separate request. `created_at` stays unchanged and `updated_at`
   advances. Supplying an old `updated_at` during the update must not override
   the trigger's current transaction time.
6. Optionally, in a disposable environment only, delete a dedicated test Auth user
   using the approved admin process. Verify their rows disappear from all three
   tables. This is a destructive test; do not delete a teammate's account.

## Inspect database configuration

The following read-only SQL can run in the Dashboard SQL Editor to inspect
configuration. The SQL Editor commonly runs with administrator privileges; it is
not a substitute for the user-token API tests above.

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'check_ins', 'journal_entries');

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'check_ins', 'journal_entries')
ORDER BY tablename, cmd;

SELECT table_name, grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'check_ins', 'journal_entries')
ORDER BY table_name, grantee, privilege_type;
```

Expect three tables with RLS enabled and twelve policies targeting only
`authenticated`. That role should have exactly SELECT/INSERT/UPDATE/DELETE table
privileges, with none for `anon` or PUBLIC. Administrator/service-role privileges
may also appear. Investigate any additional policies that could broaden access.

Record the project, migration versions, date, pass/fail results, and sanitized
responses in the PR. Remove synthetic rows using each owner's token, unless they
are agreed development fixtures. Do not attach session tokens or personal data.
