# Assessment Attempt Lifecycle

## Purpose

The assessment attempt lifecycle layer is the canonical server-side service for:

- locating the current attempt state for a user and assessment
- creating or reusing an in-progress attempt
- computing progress from persisted responses
- resolving app-facing lifecycle status from persisted attempt and result records

It is intentionally separate from engine execution. This layer does not score, normalize, build results, or persist result payloads.

## Canonical statuses

The app consumes one explicit lifecycle status model:

- `not_started`
  - no attempt exists
- `in_progress`
  - an attempt exists and is not completed yet
- `completed_processing`
  - the attempt is completed but no ready or failed result is available yet
- `ready`
  - a canonical ready result exists
- `error`
  - the attempt completed but result generation failed or the attempt itself failed

Resolution precedence is explicit:

1. no attempt -> `not_started`
2. in-progress attempt -> `in_progress`
3. completed attempt with ready result -> `ready`
4. completed attempt with failed result or failed attempt -> `error`
5. otherwise completed attempt -> `completed_processing`

## Start and reuse rules

Starting an assessment follows one deterministic rule:

- reuse the latest in-progress attempt for the same user and assessment when it exists
- otherwise create a new attempt

If the latest attempt is already completed or ready, a new attempt is created.

## Version lifecycle rules

Assessment attempts are pinned to the concrete `assessment_versions.id` resolved when the attempt is created. Publishing a newer version changes future published-version resolution only; it does not rewrite existing attempts, responses, or results.

The locked rules are:

- completed results are historical records
- result rows stay linked to the assessment version used at completion
- publishing a newer version must not mutate older attempts, responses, or results
- publishing a newer version must not automatically create attempts for users who completed an older version
- in-progress attempts continue on the version they started on
- new starts with no resumable in-progress attempt resolve the currently published version at creation time

`user_assessment_assignments` is version-specific in the database because it stores `assessment_version_id` and can link to an exact attempt path. The general assessment start/resume flow currently resolves from published assessment inventory and existing attempts; it does not remap existing attempts through assignment state.

## Progress calculation

Progress is computed from persisted data only:

- `answeredQuestions`
  - `COUNT(DISTINCT question_id)` from `responses`
- `totalQuestions`
  - count from persisted `questions` for the attempt's assessment version
- `completionPercentage`
  - integer floor of answered / total * 100

No UI assumptions or hardcoded assessment sizes are used.

## Separation from engine execution

This service may inspect persisted result readiness, but it does not:

- invoke the engine runner
- generate results
- persist result payloads

Later completion routes should call this lifecycle service to resolve and mutate attempt state, then call the engine runner separately when completion is triggered.
