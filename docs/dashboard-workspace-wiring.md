# Dashboard And Workspace Wiring

## Routes wired

The active user routes were wired in place:

- `app/(user)/app/dashboard/page.tsx`
- `app/(user)/app/assessments/page.tsx`

Supporting route compatibility fix:

- `app/(user)/app/results/page.tsx`

## Canonical services used

The live dashboard and workspace paths now depend on:

- `getRequestUserId()` from `lib/server/request-user.ts`
- `createAssessmentAttemptLifecycleService(...).getAssessmentAttemptLifecycle(...)`
- `createResultReadModelService(...).listAssessmentResults(...)`
- `listPublishedAssessmentInventory(...)`

The shared projection layer lives in:

- `lib/server/dashboard-workspace-view-model.ts`

This helper keeps page code thin and centralizes lifecycle-to-UI mapping.

## Published assessment inventory

Assessment discovery now uses:

- `lib/server/published-assessment-inventory.ts`

It lists published assessments from the database, then enriches each item with:

- canonical lifecycle state
- persisted progress counts
- latest ready result availability
- latest ready result top-signal summary when available

No mock inventory progress or placeholder result status is used in the live route.

## Lifecycle to CTA mapping

Canonical lifecycle states from Task 14 are mapped consistently as:

- `not_started` -> `Start`
- `in_progress` -> `Resume`
- `completed_processing` -> `Processing`
- `ready` -> `View Results`
- `error` -> `Review`

`Processing` is rendered as a disabled CTA because the persisted result is not ready yet.

`View Results` links to the canonical result detail route:

- `/app/results/[resultId]`

`Start`, `Resume`, and `Review` currently point to the assessment workspace anchor for the relevant assessment card:

- `/app/assessments#[assessmentKey]`

This preserves route compatibility without introducing a parallel runner flow in this task.

## Recommendation priority

Dashboard recommendation logic is deterministic and ordered as:

1. any `in_progress` assessment -> `Resume`
2. latest ready result -> `View Results`
3. first `not_started` assessment -> `Start`
4. first `completed_processing` assessment -> `Processing`
5. first `error` assessment -> `Review`

No analytics, inference, AI recommendation logic, scoring, or result recomputation was introduced.

## Auth assumption

User resolution still uses the current server-side repo pattern:

1. `x-user-id` request header
2. `SONARTRA_DEV_USER_ID` environment variable

This remains temporary until a canonical auth/session helper replaces it.

## Live-route confirmation

The active dashboard and assessment workspace routes no longer use placeholder shell state for:

- lifecycle status
- progress counts
- ready-result flags
- CTA labels
- recommendation priority
- top-signal result highlights

Those values now come from persisted lifecycle and ready-result reads only.
