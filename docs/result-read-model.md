# Result Read Model

## Purpose

The result read-model layer is the canonical read-side service for persisted assessment results.

It reads the stored canonical payload from `results`, validates that payload, and projects stable server-side view models for:

- results list
- result detail

It does not invoke the engine, recompute scores, or rebuild result content.

## Source of truth

The persisted `canonical_result_payload` is the only source of truth for result content.

This layer:

- parses the stored payload
- validates it with the canonical payload guard
- projects list/detail models from the stored data only

It does not repair malformed payloads by recomputing anything.

## List vs detail responsibilities

List projection:

- returns ready results only
- newest first by `generated_at` then `created_at` and `id`
- exposes concise summary fields such as top signal and percentage

Detail projection:

- returns the stored canonical payload fields through a stable server-side view model
- preserves stored ordering for signals, domains, bullets, and summaries
- keeps empty domains and zero-score signals when they are present in the payload

## Inclusion and exclusion rules

The list excludes:

- failed results
- processing results
- rows without a canonical payload

Only `READY` results with a persisted canonical payload are user-visible.

## Ownership model

Queries are scoped to the authenticated user's `attempts.user_id`.

For detail reads, missing and non-owned results are treated as the same outcome:

- `AssessmentResultNotFoundError`

That keeps the read-side contract simple and avoids leaking ownership details.

## Malformed payload handling

If a persisted payload does not satisfy the canonical payload contract, the service throws:

- `AssessmentResultPayloadError`

This is explicit on purpose. Read-side code should not silently mask persistence corruption.

## Separation from engine and completion

- engine:
  - computes the canonical payload
- completion service:
  - persists the payload
- result read model:
  - reads and projects the payload

This keeps one execution path for writes and one canonical read path for consumption.
