# Assessment Runner Flow

## Routes wired

Start or resume entry:

- `app/(user)/app/assessments/[assessmentKey]/page.tsx`

Owned runner route:

- `app/(user)/app/assessments/[assessmentKey]/attempts/[attemptId]/page.tsx`

Autosave API:

- `app/api/assessments/attempts/[attemptId]/responses/route.ts`

Canonical completion handoff remains:

- `app/api/assessments/complete/route.ts`

## Start and resume behavior

Dashboard and workspace `Start` and `Resume` CTAs now link to:

- `/app/assessments/[assessmentKey]`

That entry route uses `createAssessmentRunnerService(...).resolveAssessmentEntry(...)`.

Resolution rules:

- `not_started` -> create or reuse an in-progress attempt and redirect into the runner
- `in_progress` -> reuse the current in-progress attempt and redirect into the runner
- `ready` -> redirect to the canonical result detail route
- `completed_processing` -> redirect to the owned attempt route, which renders a processing state
- `error` -> redirect back to the workspace anchor

MVP error behavior is intentionally conservative:

- failed attempts are not reopened inside the editable runner
- recovery happens from the assessment workspace

## Runner data sources

The runner uses server-side helpers in:

- `lib/server/assessment-runner-service.ts`
- `lib/server/assessment-runner-queries.ts`
- `lib/server/assessment-runner-types.ts`

The runner loads:

- the owned attempt record
- the attempt-linked assessment version
- ordered questions from persisted definition tables
- ordered options from persisted definition tables
- saved responses from the `responses` table
- ready/processing/error result state from the `results` table

No mock question set is used in the live route.

## Save behavior

The runner uses deterministic autosave on option selection.

Behavior:

- each selection posts to `/api/assessments/attempts/[attemptId]/responses`
- saves are queued client-side so writes stay ordered
- responses are persisted with one row per `attempt_id + question_id`
- overwrite semantics are handled with `ON CONFLICT (attempt_id, question_id) DO UPDATE`
- the API returns updated answered/progress counts after each save

Progress survives reload because persisted responses are reloaded into the runner view model.

## Completion handoff

Final submit behavior:

1. wait for any queued save to finish
2. call `POST /api/assessments/complete`
3. pass the owned `attemptId`
4. let the canonical completion service run the engine and persist the canonical result
5. route based on returned status

Routing rules:

- `ready` -> `/app/results/[resultId]`
- `processing` -> refresh the owned attempt route, which renders a processing state
- `failed` or API error -> remain on the runner route and show a stable error state

The runner never calls the engine directly.

## Ownership and access

Owned attempt access is enforced server-side before:

- loading the runner
- saving a response
- handing off completion

Invalid or non-owned attempt routes fail cleanly and do not fabricate new state.

## Temporary auth assumption

The user app still relies on the current temporary user-resolution pattern:

- server-rendered pages use `getRequestUserId()`
- runner API calls send the current `x-user-id` header value through the client

When a shared auth/session layer is added, the runner service contracts can stay the same while the request-user plumbing changes underneath them.
