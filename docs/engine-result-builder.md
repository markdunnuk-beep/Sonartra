# Engine Result Builder (Task 11)

## Purpose

The result payload builder is the final deterministic engine layer before persistence and UI consumption.

Pipeline position:

1. Repository loads the assessment definition
2. Runtime loader validates and indexes it
3. Scoring computes raw totals
4. Normalization computes percentages and ranks
5. Result builder converts normalized engine output into the single `CanonicalResultPayload`

`CanonicalResultPayload` is the only result shape intended for later persistence and product consumption.

## Public API

```ts
buildCanonicalResultPayload(params: {
  normalizedResult: CanonicalResultBuilderInput;
}): CanonicalResultPayload
```

The builder stays pure and deterministic. It does not:

- access the database
- run repository logic
- recompute scoring
- recompute normalization
- generate AI text
- render UI or report layouts

## Direct projections vs derived fields

Direct projections from normalized output:

- `topSignal`
- `rankedSignals`
- `normalizedScores`
- `domainSummaries`
- normalization diagnostics passthrough

Deterministic derived fields:

- `overviewSummary`
- `strengths`
- `watchouts`
- `developmentFocus`
- payload diagnostics roll-up

Derived content is rule-based and template-driven. No generative narrative system is used.

## Overview and bullet generation

Overview classification uses explicit thresholds only:

- `concentrated`
  - top signal percentage at or above the concentration threshold
- `balanced`
  - top two signals are close together and the top signal is below the concentration threshold
- `mixed`
  - anything in between

Bullet collections are built from ordered normalized facts:

- `strengths`
  - top-ranked signals
- `watchouts`
  - concentration risk, sharp drop-off, or limited range
- `developmentFocus`
  - lowest-ranked signals

Each bullet uses fixed templates and deterministic ordering.

## Zero-mass behavior

Zero-mass normalized input still produces a valid canonical payload.

The builder preserves the current normalization behavior for `topSignalId`. If normalization provides a deterministic top signal under zero mass, the payload keeps it and diagnostics make that fallback explicit with:

- `zeroMass`
- `zeroMassTopSignalFallbackApplied`

## Why this remains rule-based

The payload builder exists to create a stable engine contract, not a prose-generation system.

That keeps the engine:

- deterministic
- auditable
- testable
- reusable by dashboard and result views without UI-side recomputation
