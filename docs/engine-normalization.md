# Engine Normalization (Task 10)

## Purpose

The normalization phase converts raw scoring output into stable comparable percentages and rankings for the canonical engine pipeline.

It accepts:

- `ScoreResult`

It returns:

- `NormalizedResult`

This phase does not score responses, build narrative sections, persist results, or access the database.

## Public API

```ts
normalizeScoreResult(params: {
  scoreResult: ScoreResult;
}): NormalizedResult
```

## Normalization model

Normalization keeps two percentage concepts explicit:

- global signal percentage:
  - each signal's share of the total raw score mass
- domain-local signal percentage:
  - each signal's share of its own domain raw total

Domain summaries also expose a global domain percentage based on domain raw total as a share of total raw score mass.

## Deterministic rules

- global signal percentages sum to exactly `100` when total score mass is greater than `0`
- domain-local signal percentages sum to exactly `100` for domains with signal scores and positive domain raw total
- zero-mass cases return `0` percentages and do not divide by zero
- signal output preserves canonical scoring order
- domain output preserves canonical scoring order
- ranking is deterministic and reproducible

## Rounding strategy

Integer percentages use a largest-remainder method:

1. compute exact percentages
2. floor each percentage
3. distribute remaining points by largest remainder
4. break ties deterministically by canonical order, then key, then id

This keeps display-friendly whole numbers while preserving exact `100` sums where required.

## Output behavior

`NormalizedResult` includes:

- normalized signal scores for every signal
- normalized domain summaries for every domain
- deterministic global ranks
- `topSignalId`
- restrained diagnostics for zero-mass and rounding behavior

Question-section domains with no signal scores remain present and valid.
Overlay signals normalize exactly like any other signal.

## Assumptions

- raw metadata in `ScoreResult` is already canonical and ordered
- normalization does not recompute scores from responses
- integer percentages are the canonical normalized display values for MVP
