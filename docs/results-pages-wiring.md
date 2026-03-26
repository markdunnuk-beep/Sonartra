# Results Pages Wiring

## Routes wired

The active user-facing results routes were wired in the existing user route group:

- `app/(user)/app/results/page.tsx`
- `app/(user)/app/results/[resultId]/page.tsx`

These now read real persisted results through the canonical result read-model service.

## Read-model methods used

Results list page:

- `listAssessmentResults({ userId })`

Result detail page:

- `getAssessmentResultDetail({ userId, resultId })`

## Empty and not-found behavior

Results list:

- empty ready-result set -> renders a user-facing empty state

Result detail:

- missing or non-owned result -> `notFound()`
- malformed payload -> throws the explicit payload error from the read-model service

## Canonical payload only

The pages now render persisted canonical payload data only.

They do not:

- invoke the engine
- score responses
- normalize percentages
- re-rank signals
- rebuild summaries or bullets

Ordering and content come from the stored canonical payload through the server-side read model.

## Temporary user resolution

Because the repo does not yet have a shared authenticated user helper, the pages currently resolve the user server-side from:

1. `x-user-id` request header
2. `SONARTRA_DEV_USER_ID` environment variable

This is intentionally temporary and server-side only. When the app gains a canonical auth/session helper, these pages should switch to that helper without changing the result read-model service contract.
