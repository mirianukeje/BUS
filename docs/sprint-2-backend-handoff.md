# Sprint 2 check-in backend: handoff for Mirian

Backend branch: `olaniyi-s2-check-in-data`. This work adds no check-in interface,
authentication changes, schema changes, Journal, or Guided Reflection features.

## Shared imports and input

Client components can import these without importing server code:

```ts
import {
  EMOTION_OPTIONS,
  type Emotion,
  type CheckInInput,
  type SavedCheckIn,
  type CheckInSubmissionResult,
} from "@/lib/check-ins/contracts";
import { validateCheckInInput } from "@/lib/check-ins/validation";
```

`EMOTION_OPTIONS` contains the exact submitted values: `Happy`, `Calm`, `Hopeful`,
`Sad`, `Anxious`, `Angry`, `Overwhelmed`, `Mixed`. Render the controls from this
array. Labels are case-sensitive; outer whitespace is normalized. Do not copy the
list into another file. The validator is available for optional immediate client
feedback; the server runs it independently on every submission.

Input is a plain object containing only `emotion` and optional `note`:

```ts
const input: CheckInInput = { emotion: "Hopeful", note: "A small step forward." };
```

Omitted, NULL, empty, or whitespace-only notes are stored as NULL. Nonblank note
formatting is preserved, including line breaks and outer spaces. There is no new
note-length restriction. Next.js's existing Server Action request-size limit still
applies; very large requests can fail before reaching the action.

Do not submit `id`, `user_id`, `created_at`, hidden metadata, arbitrary extra fields,
or a FormData instance to the action. Unexpected fields/types are rejected.
Database IDs and creation times come from PostgreSQL; ownership comes from the
verified cookie session. Existing saved records have `emotion: string` because
Sprint 1 accepted free-text emotions; display legacy values safely as ordinary text.

## Saving from a client component

Import `saveCheckIn` from `@/app/check-in/actions`. This is the only persistence
entry point the form needs; do not create another client or insert directly from
the UI. Here is a submission-handler example for your component:

```tsx
"use client";

import type { FormEvent } from "react";
import { saveCheckIn } from "@/app/check-in/actions";
import type { CheckInSubmissionResult } from "@/lib/check-ins/contracts";

// Inside the component, keep pending/result/error state with React hooks.
// Invoke through your async transition; retain the form on any failure.
async function submit(
  event: FormEvent<HTMLFormElement>,
  showResult: (result: CheckInSubmissionResult) => void,
  showTransportError: (message: string) => void,
) {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = new FormData(form);
  try {
    const result = await saveCheckIn({
      emotion: fields.get("emotion"),
      note: fields.get("note") ?? null,
    });
    showResult(result);
    if (result.ok) form.reset();
  } catch {
    showTransportError(
      "We could not confirm the save. Check your latest check-in before retrying.",
    );
  }
}
```

Wire this into your pending-state/transition handling, disable the submit button
while pending, and use controls named `emotion` and `note`. For a direct React form
action or `useActionState`, write a thin client wrapper that extracts those fields
into the same object; do not pass framework FormData metadata through wholesale.

Success is `{ ok: true, checkIn: SavedCheckIn }`, where the record has `id`,
`user_id`, `emotion`, `note`, and `created_at`. The action calls
`revalidatePath("/check-in")` only after confirmed success, supporting a refreshed
server-rendered latest-record display. A successful result also gives the UI the
saved record immediately. Do not clear the draft before this result.

Failures are `{ ok: false, error: { code, message, fieldErrors? } }`:

| Code | UI behavior |
| --- | --- |
| `VALIDATION_ERROR` | Show the message and optional `emotion`/`note` field errors; retain the draft |
| `AUTH_REQUIRED` | Explain that sign-in is required; provide `/login?next=%2Fcheck-in`; retain the draft where practical |
| `CONFIGURATION_ERROR` | Show unavailable feedback; no credentials or infrastructure details are returned |
| `SAVE_FAILED` | Show the generic message; the save outcome may be uncertain after a connection failure, so avoid automatic retries |

Transport/framework errors can also reject the call before a structured result
arrives; handle them without displaying raw errors or clearing the draft. Button
disabling prevents ordinary double-clicks, not all possible duplicate requests.
No idempotency key or one-check-in-per-day constraint is introduced in this sprint.

## Latest saved record in the server page

Keep the existing authenticated `CheckInPage` and `AppShell`. In
`app/check-in/page.tsx`, call `getLatestCheckIn()` from `@/lib/check-ins/server`
after the page's existing `requireUser("/check-in")`. Pass its result to your
component or render it in the page. The operation authenticates independently,
filters by the session's user ID, orders newest first, and reads at most one row.

```tsx
import { CheckInReadError, getLatestCheckIn } from "@/lib/check-ins/server";
import type { SavedCheckIn } from "@/lib/check-ins/contracts";

let latest: SavedCheckIn | null = null;
let loadMessage: string | null = null;
try {
  latest = await getLatestCheckIn();
} catch (error) {
  if (!(error instanceof CheckInReadError)) throw error;
  loadMessage = error.message;
}
// Render an empty state only when latest === null and loadMessage === null.
// Otherwise render the record or an accessible retry/sign-in message.
```

`null` means an authenticated user has no check-ins. Failures throw a sanitized
`CheckInReadError` with `AUTH_REQUIRED`, `CONFIGURATION_ERROR`, or `LOAD_FAILED`.
Use its `code` to choose sign-in vs retry feedback; never disguise failed reads
as empty history. Do not import this server-only module into a client component.

## Ownership and integration checks

Mirian owns `app/check-in/page.tsx`, her check-in components, and feature-scoped
styles. Olaniyi owns `lib/check-ins/*`, `app/check-in/actions.ts`, backend tests,
and database documentation. Coordinate changes to the shared contract first.
Reuse existing Auth/client helpers; avoid editing migrations, RLS, the shared
dashboard shell, or Journal/Guided Reflection to integrate this form.

Before marking integration complete, test through the real form with two users:
owned save/latest read, refresh persistence, blank note, invalid emotion, signed-out
and expired-session behavior, pending/double-click handling, and draft preservation
on failed saves. Backend local tests passed; live action/browser integration and
remote check-in API tests are still pending approval and frontend wiring.
