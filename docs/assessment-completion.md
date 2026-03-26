# Assessment Completion

## Purpose

The assessment completion layer is the canonical bridge from persisted attempt state into the live engine:

1. validate attempt ownership and completion state
2. load persisted final responses
3. run the canonical engine once
4. persist the canonical result payload
5. update attempt and result state for lifecycle consumption

It does not duplicate scoring, normalization, or payload building logic.

## Strict flow

The completion service follows one path only:

1. load attempt by id
2. confirm authenticated user ownership
3. inspect existing persisted result state
4. load persisted responses as source of truth
5. mark the attempt/result as processing
6. call `runAssessmentEngine(...)`
7. persist the canonical payload as the single result format
8. transition attempt/result to `ready` on success or `error` on failure

## Response source of truth

Completion uses persisted responses from the database.

The service loads one final answer per question using latest-write wins semantics. It does not trust transient client payloads for engine execution.

## Idempotency and retry behavior

MVP behavior is explicit:

- existing ready result:
  - return idempotent success without rerunning the engine
- existing processing result:
  - return stable processing state without rerunning the engine
- existing failed result:
  - rerun the engine and replace/update the result deterministically

This prevents duplicate result creation for the same attempt while keeping retries available after failure.

## Success and failure transitions

Success:

- attempt -> `RESULT_READY`
- result -> `READY` with canonical payload
- lifecycle layer resolves `ready`

Failure:

- attempt -> `FAILED`
- result -> `FAILED` with failure reason
- lifecycle layer resolves `error`

## Route contract

`POST /api/assessments/complete`

Request:

- header `x-user-id`
- JSON body with `attemptId`

Response:

- `attemptId`
- `resultId`
- `resultStatus`
- `lifecycleStatus`
- `hasResult`
- `payloadReady`
- `alreadyCompleted`
- `error`

The route is intentionally thin. All completion logic lives in the service layer.

## Separation from lifecycle and engine

- lifecycle service:
  - resolves app-facing status
- completion service:
  - validates ownership/state and persists result transitions
- engine runner:
  - performs the single computation path

Later UI and result retrieval flows should continue to read lifecycle and persisted result state rather than recomputing any engine stages.
